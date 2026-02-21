import { todoCreated } from "@/inngest/functions/todo-created"
import { todoDeleted } from "@/inngest/functions/todo-deleted"
import { todoToggled } from "@/inngest/functions/todo-toggled"

const functions = [todoCreated, todoDeleted, todoToggled]

export { functions }
