import { create as createHTTPClient } from 'kubo-rpc-client';
import { IPFSHTTPClient, CID } from 'kubo-rpc-client'
const ipfsHTTPClient = createHTTPClient({ url: 'https://ipfs.slonig.org/api/v0' });

interface GetResult {
    value: any
    remainderPath?: string
}

export async function getIPFSContentID(ipfs: any, content: string) {
    const cid = await ipfs.dag.put(content, { storeCodec: 'dag-cbor', hashAlg: 'sha2-256' });
    return cid.toString();
}

export async function getIPFSDataFromContentID(ipfs: any, cid: string) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of ipfs.cat(cid)) {
        chunks.push(Buffer.from(chunk));  // Ensure each chunk is a Buffer or Uint8Array
    }
    return Buffer.concat(chunks).toString();
}
function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Timeout after ${ms} ms`));
        }, ms);
        promise.then(
            (res) => {
                clearTimeout(timeoutId);
                resolve(res);
            },
            (err) => {
                clearTimeout(timeoutId);
                reject(err);
            }
        );
    });
}
export async function getIPFSDataFromContentID_DAG(ipfs: IPFSHTTPClient, cidStr: string): Promise<string | null> {
    const cid = CID.parse(cidStr);
    const result = await timeout<GetResult>(3000, ipfs.dag.get(cid));
    await timeout<CID>(3000, ipfs.pin.add(cid)); // TODO: add this somewhere else
    // Use type assertion if necessary
    if (typeof result.value === 'string') {
        return result.value;
    } else if (result.value && typeof (result.value as any).toString === 'function') {
        // Handle cases where result.value might be an object with a toString method
        return (result.value as any).toString();
    }
    return null;
}

async function addTextToIPFS(text: string): Promise<string | null> {
    try {
        const added = await ipfsHTTPClient.add(text);
        console.log('Added text CID:', added.cid.toString());
        const data = await getIPFSDataFromContentID(ipfsHTTPClient, added.cid.toString());
        console.log('Data from IPFS:', data);
        return added.cid.toString();
    } catch (error) {
        console.error('Error adding text to IPFS:', error);
        return null;
    }
}

(async () => {
    // const text: string = 'Denis-20231021-0859';
    // await addTextToIPFS(text);
    const data = await getIPFSDataFromContentID_DAG(ipfsHTTPClient, 'bafyreia4mjjadwle4g7gzclephmdlikkxzekj74vvorimnbowwnn5fbggq');
    console.log(data);
})();