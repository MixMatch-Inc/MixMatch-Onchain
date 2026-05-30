export function useSignup() {
  const router =
    useRouter();

  const setSession =
    useAuthStore(
      (s) => s.setSession,
    );

  const mutation =
    useMutation({
      mutationFn: signup,

      onSuccess: (
        response,
      ) => {
        if (
          !response.success
        ) {
          return;
        }

        authStorage.saveSession(
          response.data.session,
          response.data.user,
        );

        setSession(
          response.data.user,
          response.data.session,
        );

        router.push(
          "/dashboard",
        );
      },
    });

  return mutation;
}