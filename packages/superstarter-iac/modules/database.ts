import * as errors from "@superbuilders/errors"
import AWS from "alchemy/aws/control"
import { logger } from "@/logger"
import type { ModuleContext } from "@/modules/types"

const POSTGRES_VERSION = "18.3"
const POSTGRES_FAMILY = "postgres18"
const DB_INSTANCE_CLASS = "db.t4g.micro"
const DB_ALLOCATED_STORAGE = "20"
const DB_MASTER_USERNAME = "postgres"
const APP_DB_USER = "app"

interface DatabaseInput {
	readonly context: ModuleContext
	readonly vpcId: string
	readonly subnetAId: string
	readonly subnetBId: string
	readonly vercelRoleName: string
}

interface DatabaseOutput {
	readonly host: string
	readonly masterSecretArn: string
	readonly dbiResourceId: string
	readonly instanceIdentifier: string
	readonly masterUsername: string
}

async function provisionDatabase(input: DatabaseInput): Promise<DatabaseOutput> {
	const { context, vpcId, subnetAId, subnetBId, vercelRoleName } = input
	const { stage, resourcePrefix, region, accountId, tags } = context

	const dbSecurityGroup = await AWS.EC2.SecurityGroup(`db-sg-${stage}`, {
		GroupDescription: `${resourcePrefix} postgres public ingress (iam auth + ssl required)`,
		VpcId: vpcId,
		SecurityGroupIngress: [
			{
				IpProtocol: "tcp",
				FromPort: 5432,
				ToPort: 5432,
				CidrIp: "0.0.0.0/0",
				Description: "postgres 5432 from internet; iam auth + ssl enforced"
			}
		],
		SecurityGroupEgress: [
			{
				IpProtocol: "-1",
				CidrIp: "0.0.0.0/0",
				Description: "allow all outbound"
			}
		],
		Tags: tags
	})

	const dbSubnetGroupName = `${resourcePrefix}-db-subnets`
	await AWS.RDS.DBSubnetGroup(`db-subnets-${stage}`, {
		DBSubnetGroupName: dbSubnetGroupName,
		DBSubnetGroupDescription: `${resourcePrefix} postgres subnet group`,
		SubnetIds: [subnetAId, subnetBId],
		Tags: tags
	})

	const dbParameterGroupName = `${resourcePrefix}-pg18`
	await AWS.RDS.DBParameterGroup(`db-params-${stage}`, {
		DBParameterGroupName: dbParameterGroupName,
		Family: POSTGRES_FAMILY,
		Description: `${resourcePrefix} postgres 18 parameters; force ssl`,
		Parameters: {
			"rds.force_ssl": "1"
		},
		Tags: tags
	})

	const instanceIdentifier = `${resourcePrefix}-db`

	const dbInstance = await AWS.RDS.DBInstance(`db-instance-${stage}`, {
		DBInstanceIdentifier: instanceIdentifier,
		Engine: "postgres",
		EngineVersion: POSTGRES_VERSION,
		DBInstanceClass: DB_INSTANCE_CLASS,
		AllocatedStorage: DB_ALLOCATED_STORAGE,
		StorageType: "gp3",
		StorageEncrypted: true,
		MasterUsername: DB_MASTER_USERNAME,
		ManageMasterUserPassword: true,
		EnableIAMDatabaseAuthentication: true,
		MultiAZ: false,
		PubliclyAccessible: true,
		DBSubnetGroupName: dbSubnetGroupName,
		VPCSecurityGroups: [dbSecurityGroup.GroupId],
		DBParameterGroupName: dbParameterGroupName,
		Port: "5432",
		DeletionProtection: false,
		BackupRetentionPeriod: 0,
		CopyTagsToSnapshot: true,
		AutoMinorVersionUpgrade: true,
		Tags: tags
	})

	const dbiResourceId = dbInstance.DbiResourceId
	const masterSecretArn = dbInstance.MasterUserSecret?.SecretArn
	if (!masterSecretArn) {
		logger.error({ stage, instanceIdentifier }, "db instance missing master user secret arn")
		throw errors.new("rds instance returned without MasterUserSecret.SecretArn")
	}

	const host = dbInstance.Endpoint?.Address
	if (!host) {
		logger.error({ stage, instanceIdentifier }, "db instance missing endpoint address")
		throw errors.new("rds instance returned without Endpoint.Address")
	}

	const dbConnectArn = `arn:aws:rds-db:${region}:${accountId}:dbuser:${dbiResourceId}/${APP_DB_USER}`

	await AWS.IAM.RolePolicy(`vercel-db-policy-${stage}`, {
		RoleName: vercelRoleName,
		PolicyName: "db-access",
		PolicyDocument: {
			Version: "2012-10-17",
			Statement: [
				{
					Effect: "Allow",
					Action: ["rds-db:connect"],
					Resource: dbConnectArn
				},
				{
					Effect: "Allow",
					Action: ["secretsmanager:GetSecretValue"],
					Resource: masterSecretArn
				}
			]
		}
	})

	return {
		host,
		masterSecretArn,
		dbiResourceId,
		instanceIdentifier,
		masterUsername: DB_MASTER_USERNAME
	}
}

export type { DatabaseInput, DatabaseOutput }
export { provisionDatabase }
