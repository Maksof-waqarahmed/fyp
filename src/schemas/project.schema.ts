import z from "zod";

export const projectSchema = z.object({
  projectName: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});