import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AuthForm } from "@/components/AuthForm";
import { Container, Section, useSEO } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
import { useLangNavigate } from "@/components/LangLink";

export default function Auth() {
  const [sp] = useSearchParams();
  const next = sp.get("next");
  const { isAuthed, ready } = useAuth();
  const navigate = useLangNavigate();
  useSEO({ title: "Sign in · AaharNest" });

  useEffect(() => {
    if (ready && isAuthed) {
      const dest = next ? next.replace(/^\/[a-z]{2}/, "") || "/" : "/account";
      navigate(dest, { replace: true });
    }
  }, [ready, isAuthed, next, navigate]);

  const onSuccess = () => {
    const dest = next ? next.replace(/^\/[a-z]{2}/, "") || "/" : "/account";
    navigate(dest, { replace: true });
  };

  return (
    <Section>
      <Container className="flex justify-center">
        <AuthForm onSuccess={onSuccess} />
      </Container>
    </Section>
  );
}
