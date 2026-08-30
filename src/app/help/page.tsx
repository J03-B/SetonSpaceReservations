import { AuthFormCard, AuthPageTitle } from "@/components/auth/auth-close-link";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-12">
      <div className="w-full max-w-2xl">
        <AuthPageTitle>Help</AuthPageTitle>
        <AuthFormCard>
          <p className="text-center text-lg text-text-secondary">
            For any questions, email{" "}
            <a
              href={`mailto:${BRAND.email}`}
              className="font-medium text-action-primary no-underline hover:underline"
            >
              {BRAND.email}
            </a>
            .
          </p>
        </AuthFormCard>
      </div>
    </div>
  );
}
