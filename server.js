import axios from "axios";
import bodyParser from "body-parser";
import cheerio from "cheerio";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: "30mb", extended: true }));
app.use(bodyParser.urlencoded({ limit: "30mb", extended: true }));

const url = "https://www.zulubet.com/"; // URL of the website with the table(s)

app.get("/today", async (req, res) => {
  axios
    .get(url)
    .then((response) => {
      const html = response.data;
      const $ = cheerio.load(html);

      // Add your scraping logic here
      const tableData = [];
      $(".content_table1 tbody tr").each((index, element) => {
        const rowData = $(element)
          .find("td")
          .map((index, element) => $(element).text())
          .get();
        // console.log(rowData);
        if (rowData.length > 0 && rowData[0].startsWith("mf")) {
          const indicesToRemove = [3, 4, 5, 6, 7, 8];

          // Remove elements based on indices
          indicesToRemove.reverse().forEach((index) => {
            rowData.splice(index, 1);
          });
          // Remove duplicate elements within the row
          const uniqueRowData = [...new Set(rowData)];

          // Extract date and time from the first element
          const parts = uniqueRowData[0].split("; ");
          uniqueRowData[0] = parts[0].split("'")[1];
          // console.log(rowData);

          // Push the row data as an object
          tableData.push({
            date: uniqueRowData[0],
            match: uniqueRowData[1],
            outcomePredictions: uniqueRowData[2].split("%").filter(Boolean),
            predictionTip: uniqueRowData[3],
            result: uniqueRowData[9],
          });
        }
      });

      // Generate HTML table
      const tableHTML = `<style>
    th,td {
      text-align: center;
    }
  </style>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Match</th>
              <th>Outcome Predictions</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            ${tableData
              .map(
                (row) => `
                <tr>
                  <td>${row.date}</td>
                  <td>${row.match}</td>
                  <td>${row.outcomePredictions}</td>
                  <td>${row.result}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      `;
      // console.log(tableData);
      res.status(200).json({ tableHTML, tableData });
    })
    .catch((error) => {
      res.status(500).json({ error: "Error occurred while scraping data" });
    });
});

const PORT = 8080;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
    console.log("Database Connected and Server Successfully Started");
  })
  .catch((error) => console.log(`${error} did not connect`));
