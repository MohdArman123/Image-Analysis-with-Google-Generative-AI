const PORT = 8000;
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();
const fs = require("fs");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage }).single("file");
let filePath = "";

app.post("/upload", (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.send(500).json(err);
    }
    // const filePath = req.file.path
    filePath = req.file.path;
    res.send({ filePath });
  });
});

app.post("/gemini", async (req, res) => {
  try {
    // Define the JSON schema directly in the prompt
    const prompt = `
            Generate a response in JSON format with the following schema:
            {
              "type": "object",
              "properties": {
                "content": {
                  "type": "string"
                },
                "filePart": {
                  "type": "object",
                  "properties": {
                    "content": {
                      "type": "string"
                    },
                    "type": {
                      "type": "string"
                    }
                  },
                  "required": ["content", "type"]
                }
              },
              "required": ["content", "filePart"]
            }
            Prompt: ${req.body.message}
        `;

    // Function to encode file content
    function fileToGenerativePart(path) {
      return {
        content: Buffer.from(fs.readFileSync(path)).toString("base64"),
        type: "image/jpeg",
      };
    }

    // Call the model
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });
    const filePart = fileToGenerativePart(filePath);
    const result = await model.generateContent(prompt, { filePart });
    const response = await result.response;
    const text = await response.text();

    // Send the response
    res.send(text);
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred");
  }
});

// app.post('/gemini', async (req, res) => {
//     try {
//         function fileToGenerativePart(path, mimeType) {
//             return {
//                 // data: Buffer.from(fs.readFileSync(path)).toString("base64"),
//                 // mimeType : mimeType
//                 inlinedata: {
//                     data: Buffer.from(fs.readFileSync(path)).toString("base64"),
//                     mimeType : mimeType
//                 }
//             }
//         }

//         const model = genAI.getGenerativeModel({model: "gemini-1.5-flash-latest"})
//         const prompt = req.body.message
//         const result = await model.generateContent([prompt, fileToGenerativePart(filePath, "image/jpeg")])
//         const response = await result.response
//         const text = await response.text()
//         res.send(text)
//         // console.log(prompt)
//     } catch (err) {
//         console.log(err)
//     }
// })

app.listen(PORT, () => console.log("Listening to change a PORT " + PORT));
