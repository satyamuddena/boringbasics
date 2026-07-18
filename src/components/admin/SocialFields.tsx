"use client";

import { useState } from "react";
import { SOCIAL_PLATFORMS, platformFor } from "@/lib/social-platforms";
import { SocialIcon } from "@/components/SocialIcon";

const inputClass =
  "w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none";

/**
 * Platform picker + URL/handle inputs for the socials admin form. Selecting a
 * platform shows exactly what's required and adjusts the placeholders — no
 * free-text platform names, so front-end icons always match.
 */
export function SocialFields({
  defaultPlatform = "",
  defaultUrl = "",
  defaultHandle = "",
}: {
  defaultPlatform?: string;
  defaultUrl?: string;
  defaultHandle?: string;
}) {
  const [platform, setPlatform] = useState(
    defaultPlatform ? platformFor(defaultPlatform).label : SOCIAL_PLATFORMS[0].label,
  );
  const spec = platformFor(platform);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Platform
          </span>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-muted">
              <SocialIcon name={spec.key} size={16} />
            </span>
            <select
              name="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={inputClass}
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.key} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className="flex items-end pb-1 text-xs text-muted/80 sm:pb-2">
          <span>
            <span className="font-semibold uppercase tracking-wider text-accent">Required: </span>
            {spec.requires}
          </span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Link
          </span>
          <input
            name="url"
            type="url"
            required
            defaultValue={defaultUrl}
            placeholder={spec.urlPlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Display name / handle
          </span>
          <input
            name="handle"
            required
            defaultValue={defaultHandle}
            placeholder={spec.handlePlaceholder}
            className={inputClass}
          />
        </label>
      </div>
    </div>
  );
}
