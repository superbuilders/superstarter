import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/** Joins class names; when two utilities of one Tailwind group collide, the later one wins. */
export const cn = (...inputs: ReadonlyArray<ClassValue>): string => twMerge(clsx(...inputs))
