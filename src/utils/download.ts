export const download = (name: string, content: string) => {
  const a = document.createElement("a");
  a.href = content.startsWith("data:")
    ? content
    : URL.createObjectURL(new Blob([content]));
  a.download = name;
  a.click();
  if (!content.startsWith("data:"))
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
