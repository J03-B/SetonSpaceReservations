import type { ReactNode } from "react";
import { EmailTemplateCards } from "@/app/manage/email-template-cards";
import { EventCards, type ManagedEvent } from "@/app/manage/request-cards";
import { RoomLayoutCards } from "@/app/manage/room-layout-cards";
import { TempViewForm, type TempViewPerson } from "@/app/manage/temp-view-form";
import { TrustQueue, type TrustCandidate } from "@/app/manage/trust-queue";
import { AccessBadge } from "@/components/account/access-badge";
import { BRAND } from "@/lib/brand";
import { emailLogoSrc } from "@/lib/email/logo";
import { emailTemplateCards, EMAIL_PREVIEW_SAMPLE } from "@/lib/email/messages";
import { cn } from "@/lib/utils";

export type { ManagedEvent };

function ManageColumn({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[24rem] flex-1 flex-col rounded-lg border border-border bg-surface p-5",
        className,
      )}
    >
      <h3 className="text-center text-lg font-semibold">{title}</h3>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export async function ManageBoard({
  isAdmin,
  rejected,
  requests,
  reservations,
  trustCandidates,
  tempViewPeople,
  openDeclineRequestId,
  approvedEvent,
  noticeApproved,
}: {
  isAdmin: boolean;
  rejected: ManagedEvent[];
  requests: ManagedEvent[];
  reservations: ManagedEvent[];
  trustCandidates: TrustCandidate[];
  tempViewPeople: TempViewPerson[];
  openDeclineRequestId?: string;
  approvedEvent?: ManagedEvent;
  noticeApproved?: boolean;
}) {
  const logoSrc = emailLogoSrc() ?? BRAND.logoSrc;

  return (
    <div className="space-y-10">
      {isAdmin ? (
        <div>
          <h2 className="flex justify-center">
            <AccessBadge label="Admin" className="px-4 py-2 text-lg font-semibold" />
          </h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            <ManageColumn title="Room layouts" className="min-w-[16rem]">
              <RoomLayoutCards />
            </ManageColumn>
            <ManageColumn title="Email templates" className="min-w-[16rem]">
              <EmailTemplateCards
                templates={emailTemplateCards({
                  ...EMAIL_PREVIEW_SAMPLE,
                  logoSrc,
                })}
              />
            </ManageColumn>
            <ManageColumn title="Temporary view" className="min-w-[16rem]">
              <TempViewForm people={tempViewPeople} />
            </ManageColumn>
            <ManageColumn
              title="Trusted access requests"
              className="min-w-[16rem]"
            >
              <TrustQueue candidates={trustCandidates} />
            </ManageColumn>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="flex justify-center">
          <AccessBadge label="Manager" className="px-4 py-2 text-lg font-semibold" />
        </h2>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
          <ManageColumn
            title="Rejected Requests"
            className="min-w-[22rem] flex-[0.85]"
          >
            <EventCards
              items={rejected}
              caption="Rejected Requests"
              empty="No rejected requests"
              columns="who-why"
            />
          </ManageColumn>
          <ManageColumn
            title="Pending Requests"
            className="min-w-[36rem] flex-[2]"
          >
            <EventCards
              items={requests}
              caption="Pending Requests"
              empty="No pending requests"
              showDecisions
              openDeclineRequestId={openDeclineRequestId}
              approvedEvent={approvedEvent}
              noticeApproved={noticeApproved}
            />
          </ManageColumn>
          <ManageColumn
            title="Confirmed Reservations"
            className="min-w-[22rem] flex-[0.85]"
          >
            <EventCards
              items={reservations}
              caption="Confirmed Reservations"
              empty="No confirmed reservations"
              columns="who-why"
            />
          </ManageColumn>
        </div>
      </div>
    </div>
  );
}
