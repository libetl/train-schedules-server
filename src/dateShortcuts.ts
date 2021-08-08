export const getDate = () =>
  new Date().toLocaleDateString("en-US").replace(/\//g, "");
export const getTime = () =>
  new Date().toLocaleTimeString("fr").replace(/:/g, "");
