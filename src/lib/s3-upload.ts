import { env } from "@/lib/env";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: env.AWS_REGION!,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

type Props = {
  file: File;
  userId: string;
  isBusinessProof?: boolean;
  prefix?: string;
};

export async function uploadToS3({
  file,
  userId,
  prefix = "",
}: Props): Promise<
  { url: string; error?: never } | { url?: never; error: string }
> {
  const bucket = env.AWS_BUCKET_NAME!;

  try {
    // Validate file type
    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("application/")
    )
      return { error: "Supported file types are image, pdf, doc file." };

    // Validate file size (15MB limit)
    if (file.size > 15 * 1024 * 1024)
      return { error: "File size must be less than 15MB" };

    const fileExtension = file.name.split(".").pop();
    const fileName = `${prefix}${userId}-${Date.now()}.${fileExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    const url = `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${fileName}`;

    return { url };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { error: "Failed to upload image" };
  }
}

export async function getSignedUrl(url: string) {
  const urlObject = new URL(url);
  const bucket = urlObject.host.split(".")[0];
  const key = urlObject.pathname.slice(1);

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const signedUrl = await awsGetSignedUrl(s3Client, command, {
    expiresIn: 900, // 15 minutes in seconds
  });

  return signedUrl;
}

export async function openS3File(url: string) {
  try {
    const signedUrl = await getSignedUrl(url);
    window.open(signedUrl, "_blank");
  } catch (error) {
    console.error("Failed to generate signed URL:", error);
    throw new Error("Failed to open file");
  }
}

export async function removeFromS3(url: string) {
  const urlObject = new URL(url);
  const bucket = urlObject.host.split(".")[0];
  const key = urlObject.pathname.slice(1);

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3Client.send(command);
}

export interface S3UploadResponse {
  url?: string;
  error?: string;
}

/**
 * Copy an S3 image to a new location with a new key
 * Used for duplicating entities with their images
 */
export async function copyS3Image(
  sourceUrl: string,
  userId: string,
  prefix: string = ""
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  const bucket = env.AWS_BUCKET_NAME!;

  try {
    // Parse source URL to get the key
    const urlObject = new URL(sourceUrl);
    const sourceKey = urlObject.pathname.slice(1);

    // Get the file extension from source
    const fileExtension = sourceKey.split(".").pop() || "jpg";

    // Generate new key
    const newKey = `${prefix}${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // First, get the original object
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: sourceKey,
    });

    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      return { error: "Failed to retrieve source image" };
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body.transformToWebStream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);

    // Upload to new location
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: newKey,
      Body: buffer,
      ContentType: response.ContentType || "image/jpeg",
    });

    await s3Client.send(putCommand);

    const newUrl = `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${newKey}`;

    return { url: newUrl };
  } catch (error) {
    console.error("Failed to copy S3 image:", error);
    return { error: "Failed to copy image" };
  }
}

/**
 * Copy multiple S3 images in parallel
 */
export async function copyS3Images(
  sourceUrls: string[],
  userId: string,
  prefix: string = ""
): Promise<string[]> {
  if (!sourceUrls || sourceUrls.length === 0) return [];

  const results = await Promise.all(
    sourceUrls.map((url) => copyS3Image(url, userId, prefix))
  );

  // Return only successful copies, log errors
  return results
    .filter((result) => {
      if (result.error) {
        console.error("Failed to copy image:", result.error);
        return false;
      }
      return true;
    })
    .map((result) => result.url!);
}
