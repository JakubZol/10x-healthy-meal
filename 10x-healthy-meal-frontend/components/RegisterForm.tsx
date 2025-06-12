import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Stack, TextField, Button } from "@mui/material";

type RegisterFormProps = {
  setError: (error: string | null) => void;
}

export const RegisterForm = ({ setError }: RegisterFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/profile`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
        <form onSubmit={handleSignUp}>
            <Stack direction="column" height="100%" justifyContent="space-between" gap={2}>
              <TextField
                  label="email"
                  type="email"
                  variant="outlined"
                  onChange={(event) => {
                    setEmail(event?.target?.value)
                  }}
                  required
              />
              <TextField
                  label="password"
                  type="password"
                  variant="outlined"
                  onChange={(event) => {
                    setPassword(event?.target?.value)
                  }}
                  required
              />
              <TextField
                  label="repeat password"
                  type="password"
                  variant="outlined"
                  onChange={(event) => {
                    setRepeatPassword(event?.target?.value)
                  }}
                  required
              />

              <Button variant="contained" type="submit" sx={{ height: 50 }} loading={isLoading}>
                Register
              </Button>
            </Stack>
        </form>
  );
}
