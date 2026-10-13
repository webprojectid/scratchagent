"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import styles from "./pricing-01.module.css";

export type PricingPlan = {
  name: string; description: string; price: string; period?: string;
  features: string[]; featuresLabel: string; actionLabel: string; href: string;
  highlighted?: boolean; controls?: ReactNode; priceNote?: ReactNode;
  pending?: boolean; onChoose?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function Pricing({ plans }: { plans: PricingPlan[] }) {
  return <div className={styles.grid}>{plans.map((plan) => (
    <article key={plan.name} aria-label={`${plan.name} plan`}>
      <Card className={cn(styles.card, plan.highlighted && styles.pro)}>
        <CardContent className={styles.content}>
          <div className={styles.summary}>
            <div>
              <Badge variant="outline" className={styles.planLabel}><h3>{plan.name}</h3></Badge>
              <p className={styles.description}>{plan.description}</p>
              {plan.controls && <div className={styles.controls}>{plan.controls}</div>}
            </div>
            <div className={styles.purchase}>
              <p className={styles.price}><strong>{plan.price}</strong>{plan.period && <span>{plan.period}</span>}</p>
              <div className={styles.priceNote}>{plan.priceNote}</div>
              <Button asChild className={styles.action}>
                <Link href={plan.href} onClick={plan.onChoose} aria-busy={plan.pending || undefined}>
                  <span>{plan.actionLabel}</span>
                  <span className={styles.actionIcon} aria-hidden="true"><ArrowUpRight size={17} /></span>
                </Link>
              </Button>
            </div>
          </div>
          <div className={styles.features}>
            <h4>{plan.featuresLabel}</h4>
            <ul>{plan.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
          </div>
        </CardContent>
      </Card>
    </article>
  ))}</div>;
}
