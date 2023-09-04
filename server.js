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

const url =
  "https://www.stats24.com/Matches/TodayMatchesList?sportId=1&date=09%2F04%2F2023&countryName=Nigeria&countryCode=NGA&minOdd=0&deviceType=mobile&filter=0&sortingVal=3&probabilityRange=0&marketId=0&pageIndex=0"; // URL of the website with the table(s)

app.get("/today", async (req, res) => {
  axios
    .get(url)
    .then((response) => {
      const html = response.data;
      const $ = cheerio.load(html);

      const scrapedData = [];

      $(".sts_cont_list_sec").each((index, element) => {
        const leagueName = $(element).find(".sts_cont_list_head").text().trim();
        const headLabels = [];
        $(element)
          .find(".sts_cont_list_row_thead > div")
          .each((i, headElement) => {
            headLabels.push($(headElement).text().trim());
          });

        $(element)
          .find(".sts_cont_list_row_tbody")
          .each((i, tbodyElement) => {
            const rowData = {};
            $(tbodyElement)
              .find("> div")
              .each((j, tdElement) => {
                rowData[headLabels[j]] = $(tdElement).text().trim();
              });

            // Extract "Matches" value from .sts_cont_list_matches_inr
            const matchesInr = $(tbodyElement).find(
              ".sts_cont_list_matches_inr a"
            );
            if (matchesInr.length > 0) {
              rowData["Matches"] = matchesInr.attr("aria-label").trim();
            }

            // Include league name as a property of each match
            rowData["leagueName"] = leagueName;

            // Push the match data as an individual object
            scrapedData.push(rowData);
          });
      });

      // console.log(scrapedData);
      const tableHTML = [];
      res.status(200).json({ scrapedData });
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
