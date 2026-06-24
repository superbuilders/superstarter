import { logger } from "@/logger"

async function greet(name: string): Promise<string> {
	"use step"
	const greeting = `hello, ${name}`
	logger.info({ name, greeting }, "example step ran")
	return greeting
}

async function helloWorkflow(name: string): Promise<{ message: string }> {
	"use workflow"
	const message = await greet(name)
	return { message }
}

export { helloWorkflow }
