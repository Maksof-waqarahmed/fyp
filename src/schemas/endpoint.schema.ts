import { z } from "zod";

export const endPointSchema = z.object({
    projectID: z.string().min(1, "Project ID is required"),
    projectName: z.string().min(1, "Project Name is required").optional(),
    endPoints: z.array(
        z.object({
            name: z.string().trim().min(2, "Name must be at least 2 characters"),
            url: z.string().url("Invalid URL"),
            checkInterval: z
                .number({
                    required_error: "Interval is required",
                    invalid_type_error: "Interval must be a number",
                })
                .int()
                .min(5, "Minimum interval is 5 minutes")
        })
    ).min(1, "At least one endpoint is required")
})