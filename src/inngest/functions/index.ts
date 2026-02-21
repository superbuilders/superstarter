import { todoCreated } from "@/inngest/functions/todo-created"
import { todoDeleted } from "@/inngest/functions/todo-deleted"
import { todoCompleted } from "@/inngest/functions/todo-completed"

const functions = [todoCreated, todoDeleted, todoCompleted]

export { functions }
