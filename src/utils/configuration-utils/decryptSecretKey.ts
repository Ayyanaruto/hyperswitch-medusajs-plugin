
import { decrypt } from './sub:configuration-utils'
/**
 * Decrypts an encrypted secret key.
 *
 * @param {string} encryptedKey - The encrypted key in string format.
 * @returns {Promise<string>} - A promise that resolves to the decrypted secret key.
 * @throws {Error} - Throws an error if decryption fails.
 */
export const decryptSecretKey = async (key:string,encryptedKey: string): Promise<string> => {
  try {
    const secretKey = JSON.parse(encryptedKey);
    /**
     * TODO: REMOVE THE CONSTANT KEY AND
     * REPLACE IT WITH THE ACTUAL ENCRYPTED SECRET KEY
     */
    secretKey.key = key || "mPFtoTZQbMTSkX5MmXoQ41gdzgM1bFR/3JcoWSGkTjg=";
    return await decrypt(secretKey);
  }
  catch (e) {
    throw new Error("Error in decrypting secret key");
  }
};
