"use server";
import { auth } from "@/auth";
import { db } from "@/db";
import paths from "@/paths";
import { Post } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

interface createPostFormState {
  errors: {
    title?: string[];
    content?: string[];
    _forms?: string[];
  };
}
const createPostSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
});
export async function createPost(
  slug: string,
  formState: createPostFormState,
  formData: FormData
): Promise<createPostFormState> {
  const sesssion = await auth();
  const result = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  });
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
  if (!sesssion || !sesssion.user) {
    return {
      errors: {
        _forms: ["you must be signed in to submit a new post"],
      },
    };
  }
  const topic = await db.topic.findFirst({
    where: { slug },
  });
  if (!topic) {
    return {
      errors: {
        _forms: ["Cannot find topic"],
      },
    };
  }
  let post: Post;
  try {
    post = await db.post.create({
      data: {
        title: result.data.title,
        content: result.data.content,
        userId: sesssion.user.id,
        topicId: topic.id,
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
          _forms: ["Failed to create post"],
        },
      };
    }
  }
  revalidatePath(paths.topicShow(slug));
  redirect(paths.postShow(slug, post.id));
}
