export const storeHtml = async (html: string, _hint?: string): Promise<string> => {
  return html;
};

export const loadHtml = async (ref: string | null | undefined): Promise<string> => {
  return ref ?? '';
};
