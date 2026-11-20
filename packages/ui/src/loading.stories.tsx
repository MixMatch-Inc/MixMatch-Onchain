import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton, SkeletonList, Spinner } from "./loading";

const meta: Meta = { title: "Loading" };
export default meta;
export const SpinnerStory: StoryObj = { name: "Spinner", render: () => <Spinner /> };
export const SkeletonStory: StoryObj = { name: "Skeleton", render: () => <Skeleton width={200} /> };
export const List: StoryObj = { render: () => <SkeletonList rows={3} /> };
