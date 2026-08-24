declare module "jsmediatags/dist/jsmediatags.js" {
  const jsmediatags: {
    read: (
      file: File,
      callbacks: {
        onSuccess: (result: { tags: Record<string, unknown> }) => void;
        onError: (error: { info?: string }) => void;
      },
    ) => void;
  };
  export default jsmediatags;
}
