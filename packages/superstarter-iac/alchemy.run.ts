import alchemy from "alchemy"
import { computeOidcThumbprint } from "@/bootstrap"
import { iacEnv } from "@/env"
import { resolveAccountId } from "@/lib/deployer"
import { logger } from "@/logger"
import { provisionDatabase } from "@/modules/database"
import { provisionIdentity } from "@/modules/identity"
import { provisionNetwork } from "@/modules/network"
import type { ModuleContext } from "@/modules/types"

const REGION = "us-east-1"
const OIDC_HOST = "oidc.vercel.com"
const STAGE = "main"

const isDestroy = process.argv.includes("--destroy")
const phase = isDestroy ? "destroy" : "up"

logger.info(
	{ stage: STAGE, region: REGION, teamSlug: iacEnv.VERCEL_TEAM_SLUG, phase },
	"alchemy run starting"
)

const accountId = await resolveAccountId(REGION)

const oidcThumbprint = await computeOidcThumbprint(OIDC_HOST)

const app = await alchemy("superstarter", {
	stage: STAGE,
	password: iacEnv.ALCHEMY_PASSWORD
})

const resourcePrefix = `superstarter-${STAGE}`
const tags = [
	{ Key: "Project", Value: "superstarter" },
	{ Key: "Stage", Value: STAGE }
]

const context: ModuleContext = {
	region: REGION,
	stage: STAGE,
	resourcePrefix,
	accountId,
	tags
}

const network = await provisionNetwork(context)

const identity = await provisionIdentity({
	context,
	oidcHost: OIDC_HOST,
	oidcThumbprint,
	teamSlug: iacEnv.VERCEL_TEAM_SLUG,
	projectName: iacEnv.VERCEL_PROJECT_NAME
})

const database = await provisionDatabase({
	context,
	vpcId: network.vpcId,
	subnetAId: network.subnetAId,
	subnetBId: network.subnetBId,
	vercelRoleName: identity.roleName
})

logger.info(
	{
		stage: STAGE,
		vercelEnv: {
			AWS_ROLE_ARN: identity.roleArn,
			DATABASE_HOST: database.host,
			DATABASE_ADMIN_SECRET_ARN: database.masterSecretArn
		},
		info: {
			AWS_REGION: REGION,
			DATABASE_PORT: 5432,
			DATABASE_MASTER_USER: database.masterUsername,
			DB_INSTANCE_RESOURCE_ID: database.dbiResourceId,
			DB_INSTANCE_IDENTIFIER: database.instanceIdentifier
		}
	},
	"deploy complete"
)

void app
