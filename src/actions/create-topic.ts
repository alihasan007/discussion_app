"use server";
import type { Topic } from "@prisma/client";
import { redirect } from "next/navigation";
import paths from "@/paths";
import { db } from "@/db";
import { auth } from "@/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

interface createTopicFormState {
  errors: {
    name?: string[];
    description?: string[];
    _forms?: string[];
  };
}

const createTopicSchema = z.object({
  name: z
    .string()
    .min(3)
    .regex(/[a-z-]/, {
      message: "Must be lower case letters or dashes without spaces",
    }),
  description: z.string().trim().min(10),
});

export async function createTopic(
  formState: createTopicFormState,
  formData: FormData
): Promise<createTopicFormState> {
  const sesssion = await auth();
  const result = createTopicSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }
  if (!sesssion || !sesssion.user) {
    return {
      errors: {
        _forms: ["you must be signed in to submit a new topic"],
      },
    };
  }
  let topic: Topic;
  try {
    topic = await db.topic.create({
      data: {
        slug: result.data.name,
        description: result.data.description,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return {
        errors: {
          _forms: [err.message],
        },
      };
    } else {
      return {
        errors: {
          _forms: ["something went wrong"],
        },
      };
    }
  }

  revalidatePath("/");
  redirect(paths.topicShow(topic.slug));
}
