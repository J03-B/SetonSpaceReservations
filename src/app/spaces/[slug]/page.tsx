import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SpaceDetailRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/?room=${slug}`);
}
