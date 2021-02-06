"use strict";

const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const uuid = require("uuid-v4");

module.exports = {
  init: (config) => {
    admin.initializeApp({
      credential: admin.credential.cert(config),
      storageBucket: config.bucket,
    });
    let bucket = admin.storage().bucket();

    return {
      upload: async (file) => {
        try {
          const tempFilePath = path.join(os.tmpdir(), file.name);
          fs.writeFileSync(tempFilePath, file.buffer);

          const [firestoreFile] = await bucket.upload(tempFilePath, {
            destination: `${file.hash}${file.ext}`,
            contentType: file.mime,
            metadata: {
              cacheControl: "no-cache",
              metadata: {
                firebaseStorageDownloadTokens: uuid(),
              },
            },
          });
          const [url] = await firestoreFile.getSignedUrl({
            action: "read",
            expires: "03-01-2500",
          });

          fs.unlinkSync(tempFilePath);
          //add dummy param to do not mess with token
          file.url = `${url}&safewithFileCaching=dummyValue`;
        } catch (error) {
          console.log(`Upload failed: ${error}`);
        }
      },
      delete: async (file) => {
        const filename = `${file.hash}${file.ext}`;
        try {
          await bucket.file(filename).delete();
        } catch (error) {
          console.log(`Could not delete: ${error}`);
        }
      },
    };
  },
};
