import {
	POSTGRES_MASTER_USERNAME,
	POSTGRES_PORT,
	POSTGRES_PRINCIPALS
} from "@superstarter/database/postgres/principals"
import type { SubnetId, VpcId } from "alchemy/AWS/EC2"
import * as EC2 from "alchemy/AWS/EC2"
import type * as IAM from "alchemy/AWS/IAM"
import * as RDS from "alchemy/AWS/RDS"
import type { Input } from "alchemy/Input"
import * as Output from "alchemy/Output"
import { Duration, Effect, Schema } from "effect"
import { databaseUserArn, type Names } from "#names.ts"

/**
 * One VPC with two public subnets in distinct zones: an RDS subnet group needs two zones even for a
 * single-AZ instance, and the internet route is what makes the public endpoint reachable.
 */
const ADDRESSING = {
	vpcCidr: "10.0.0.0/16",
	subnets: [
		{ zone: "us-east-1a", cidr: "10.0.0.0/20" },
		{ zone: "us-east-1b", cidr: "10.0.16.0/20" }
	]
} as const

/** RDS reports these attributes once the instance exists; a missing one is a provider defect. */
const required = Output.mapEffect((value: string | undefined) =>
	Schema.decodeUnknownEffect(Schema.NonEmptyString)(value).pipe(Effect.orDie)
)

/** The public subnets RDS places the instance in: a VPC, its internet route and two zones. */
export const postgresNetwork = Effect.fn(function* (names: Names) {
	const tags = { ...names.tags }
	const vpc = yield* EC2.Vpc("PostgresVpc", {
		cidrBlock: ADDRESSING.vpcCidr,
		enableDnsSupport: true,
		enableDnsHostnames: true,
		tags
	})
	const gateway = yield* EC2.InternetGateway("PostgresInternetGateway", { vpcId: vpc.vpcId, tags })
	const routes = yield* EC2.RouteTable("PostgresRouteTable", { vpcId: vpc.vpcId, tags })
	const route = yield* EC2.Route("PostgresInternetRoute", {
		routeTableId: routes.routeTableId,
		destinationCidrBlock: "0.0.0.0/0",
		gatewayId: gateway.internetGatewayId
	})
	const subnetIds = yield* Effect.forEach(ADDRESSING.subnets, (subnet) =>
		Effect.gen(function* () {
			const resource = yield* EC2.Subnet(`PostgresSubnet_${subnet.zone}`, {
				vpcId: vpc.vpcId,
				cidrBlock: subnet.cidr,
				availabilityZone: subnet.zone,
				mapPublicIpOnLaunch: false,
				tags
			})
			const association = yield* EC2.RouteTableAssociation(`PostgresSubnetRoute_${subnet.zone}`, {
				routeTableId: routes.routeTableId,
				subnetId: resource.subnetId
			})
			return Output.all(resource.subnetId, association.associationId, route.state).pipe(
				Output.map(([subnetId]) => subnetId)
			)
		})
	)
	return { vpcId: vpc.vpcId, subnetIds }
})

/**
 * The PostgreSQL instance: the smallest RDS sizing, reachable from anywhere on 5432, where IAM
 * authentication and TLS 1.3 are the guards. Nothing is retained: no deletion protection, no
 * backups and no final snapshot, so destroying the stage deletes the data.
 */
export const postgresInstance = Effect.fn(function* (
	input: Readonly<{
		names: Names
		account: string
		network: Readonly<{
			vpcId: Output.Output<VpcId>
			subnetIds: readonly Output.Output<SubnetId>[]
		}>
	}>
) {
	const { names } = input
	const tags = { ...names.tags }
	const securityGroup = yield* EC2.SecurityGroup("PostgresSecurityGroup", {
		vpcId: input.network.vpcId,
		groupName: names.database,
		description: names.databaseIngressDescription,
		ingress: [
			{ ipProtocol: "tcp", fromPort: POSTGRES_PORT, toPort: POSTGRES_PORT, cidrIpv4: "0.0.0.0/0" }
		],
		egress: [],
		tags
	})
	const subnetGroup = yield* RDS.DBSubnetGroup("PostgresSubnetGroup", {
		dbSubnetGroupName: names.database,
		description: names.databaseSubnetsDescription,
		subnetIds: [...input.network.subnetIds],
		tags
	})
	const parameters = yield* RDS.DBParameterGroup("PostgresParameters", {
		dbParameterGroupName: names.database,
		family: "postgres18",
		description: names.databaseParametersDescription,
		parameters: {
			"rds.force_ssl": "1",
			ssl_min_protocol_version: "TLSv1.3"
		},
		tags
	})
	const database = yield* RDS.DBInstance("Postgres", {
		dbInstanceIdentifier: names.database,
		engine: "postgres",
		engineVersion: "18.3",
		dbInstanceClass: "db.t4g.micro",
		allocatedStorage: 20,
		storageType: "gp3",
		storageEncrypted: true,
		masterUsername: POSTGRES_MASTER_USERNAME,
		manageMasterUserPassword: true,
		enableIAMDatabaseAuthentication: true,
		port: POSTGRES_PORT,
		dbSubnetGroupName: subnetGroup.dbSubnetGroupName,
		dbParameterGroupName: parameters.dbParameterGroupName,
		vpcSecurityGroupIds: [securityGroup.groupId],
		publiclyAccessible: true,
		networkType: "IPV4",
		multiAZ: false,
		deletionProtection: false,
		backupRetentionPeriod: Duration.zero,
		skipFinalSnapshot: true,
		autoMinorVersionUpgrade: true,
		allowMajorVersionUpgrade: false,
		copyTagsToSnapshot: true,
		tags
	})
	const dbiResourceId = database.dbiResourceId.pipe(required)
	const adminSecretArn = database.masterUserSecretArn.pipe(required)
	const runtimeStatements: readonly Input<IAM.PolicyStatement>[] = [
		{
			Sid: "PostgresAppConnect",
			Effect: "Allow",
			Action: ["rds-db:connect"],
			Resource: [
				dbiResourceId.pipe(
					Output.map((id) =>
						databaseUserArn({
							account: input.account,
							dbiResourceId: id,
							user: POSTGRES_PRINCIPALS.app
						})
					)
				)
			]
		},
		{
			Sid: "PostgresAdminSecret",
			Effect: "Allow",
			Action: ["secretsmanager:GetSecretValue"],
			Resource: [adminSecretArn]
		}
	]
	return {
		host: database.endpointAddress.pipe(required),
		adminSecretArn,
		/** What the Vercel runtime may do with this instance. */
		runtimeStatements
	}
})
