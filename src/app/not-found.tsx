import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[80svh] flex-col justify-center py-32">
      <p className="t-ui text-dust">404</p>
      <h1 lang="ckb" dir="rtl" className="t-display-ku mt-5 text-left">
        ئەم پەڕەیە نییە.
      </h1>
      <p className="t-meta mt-4 text-ash">
        This page isn&rsquo;t here
      </p>
      <p className="t-meta mt-8 max-w-[46ch] text-ash">
        The link may be from an older drop. Everything we currently make is in the shop.
      </p>
      <div className="mt-10">
        <Button href="/shop" ku="بڕۆ بۆ فرۆشگا">
          Go to the shop
        </Button>
      </div>
    </Container>
  );
}
