export function useSessionBootstrap() {
  const setSession =
    useAuthStore(
      (s) => s.setSession,
    );

  useEffect(() => {
    const stored =
      authStorage.loadSession();

    if (!stored) {
      return;
    }

    setSession(
      stored.user,
      stored.session,
    );
  }, []);
}