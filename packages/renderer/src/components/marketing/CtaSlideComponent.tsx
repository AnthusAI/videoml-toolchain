import React from 'react';
import { TitleSlideLayout } from '../layouts/TitleSlideLayout.js';

export type CtaSlideProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  background?: string;
};

export function CtaSlideComponent({
  eyebrow = 'Explore',
  title = 'Dive into the demos',
  subtitle = 'Join the waitlist to follow the launch',
  background,
}: CtaSlideProps) {
  return (
    <TitleSlideLayout
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      verticalAlign="center"
      horizontalAlign="center"
      entranceStartFrame={-999}
      background={background}
    />
  );
}
