import { Container } from "@/components/ui/Container";

export default function Loading() {
  return (
    <Container className="pt-[calc(var(--header-h)+56px)] pb-32">
      <p className="t-ui text-ash" aria-busy="true">
        Loading your order…
      </p>
    </Container>
  );
}
