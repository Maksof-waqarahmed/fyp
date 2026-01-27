import z from "zod";

export const monitorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Invalid URL"),
  checkInterval: z.string().min(1),
  timeout: z.string().min(1),
  emailAlert: z.boolean(),
  slackAlert: z.boolean(),
  email: z.string().email().optional(),
  slackWebhook: z.string().optional(),
});

export const projectSchema = z.object({
  projectName: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
