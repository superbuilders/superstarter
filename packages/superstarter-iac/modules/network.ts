import AWS from "alchemy/aws/control"
import type { ModuleContext } from "@/modules/types"

const AZ_A = "us-east-1a"
const AZ_B = "us-east-1b"

interface NetworkOutput {
	readonly vpcId: string
	readonly subnetAId: string
	readonly subnetBId: string
}

async function provisionNetwork(context: ModuleContext): Promise<NetworkOutput> {
	const { stage, tags } = context

	const vpc = await AWS.EC2.VPC(`vpc-${stage}`, {
		CidrBlock: "10.0.0.0/16",
		EnableDnsSupport: true,
		EnableDnsHostnames: true,
		Tags: tags
	})

	const subnetA = await AWS.EC2.Subnet(`subnet-a-${stage}`, {
		VpcId: vpc.VpcId,
		AvailabilityZone: AZ_A,
		CidrBlock: "10.0.0.0/20",
		MapPublicIpOnLaunch: true,
		Tags: tags
	})

	const subnetB = await AWS.EC2.Subnet(`subnet-b-${stage}`, {
		VpcId: vpc.VpcId,
		AvailabilityZone: AZ_B,
		CidrBlock: "10.0.16.0/20",
		MapPublicIpOnLaunch: true,
		Tags: tags
	})

	const internetGateway = await AWS.EC2.InternetGateway(`igw-${stage}`, {
		Tags: tags
	})

	await AWS.EC2.VPCGatewayAttachment(`igw-attach-${stage}`, {
		VpcId: vpc.VpcId,
		InternetGatewayId: internetGateway.InternetGatewayId
	})

	const routeTable = await AWS.EC2.RouteTable(`rt-${stage}`, {
		VpcId: vpc.VpcId,
		Tags: tags
	})

	await AWS.EC2.Route(`default-route-${stage}`, {
		RouteTableId: routeTable.RouteTableId,
		DestinationCidrBlock: "0.0.0.0/0",
		GatewayId: internetGateway.InternetGatewayId
	})

	await AWS.EC2.SubnetRouteTableAssociation(`rt-assoc-a-${stage}`, {
		SubnetId: subnetA.SubnetId,
		RouteTableId: routeTable.RouteTableId
	})

	await AWS.EC2.SubnetRouteTableAssociation(`rt-assoc-b-${stage}`, {
		SubnetId: subnetB.SubnetId,
		RouteTableId: routeTable.RouteTableId
	})

	return {
		vpcId: vpc.VpcId,
		subnetAId: subnetA.SubnetId,
		subnetBId: subnetB.SubnetId
	}
}

export type { NetworkOutput }
export { provisionNetwork }
