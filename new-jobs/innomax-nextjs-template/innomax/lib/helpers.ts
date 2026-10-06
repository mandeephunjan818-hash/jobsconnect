export const metafield = (data: any, key: any) => {
  const json_response = data?.metafields?.edges.find(
    (item: any) => item?.node?.key === key
  )?.node.value;
  const convert = json_response ? JSON.parse(json_response) : null;
  return convert?.children[0]?.children[0]?.value;
};

export function showImage(item: any, loop?: any) {
  {
    if (item) {
      if (loop) {
        return `${process.env.NEXT_PUBLIC_API_BASE_URL}${item?.attributes?.url}`;
      } else {
        return `${process.env.NEXT_PUBLIC_API_BASE_URL}${item?.data?.attributes?.url}`;
      }
    } else {
      ("");
    }
  }
}

export const toFixed = (num: any) => {
  return Number(num).toFixed(2);
};
