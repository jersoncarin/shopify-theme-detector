const cheerio = require("cheerio");
const express = require("express");
const ua = new (require("user-agents"))();
const { re, match } = require("./regex");
const puppeteer = require("puppeteer");
const fs = require("fs");
const sharp = require("sharp");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const port = process.env.PORT || 3000;

app.get("/v1", async (req, res) => {
  const url = req.query.url;

  if (!url)
    return res.status(400).send({ message: "Bad request method", status: 400 });

  try {
    const web = await fetch(url, { "User-Agent": ua.toString() }).then((res) =>
      res.text()
    );

    if (!web)
      return res
        .status(400)
        .send({ message: "Bad request method", status: 400 });

    const $ = cheerio.load(web);

    const title = $("head > title").text().trim();
    const description = $('head > meta[name="description"]')
      .attr("content")
      .trim();
    const canonical = $('head > link[rel="canonical"]').attr("href").trim();

    const shop = match(re(/Shopify\.shop = \"(.*)\";/gim, web));
    const locale = match(re(/Shopify\.locale = \"(.*)\";/gim, web));
    const country = match(re(/Shopify\.country = \"(.*)\";/gim, web));
    let currency = match(re(/Shopify\.currency = (.*);/gim, web));
    let theme = match(re(/Shopify\.theme = (.*);/gim, web));

    try {
      currency = JSON.parse(currency);
      theme = JSON.parse(theme);
    } catch (err) {
      return res
        .status(404)
        .send({ message: "Request for theme not found", status: 404 });
    }

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--use-gl=egl",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--user-agent=" + ua.toString(),
        ],
        ignoreDefaultArgs: ["--disable-extensions"],
      });

      const page = await browser.newPage();

      await page.setViewport({ width: 1200, height: 720 });

      // Goto the page url
      await page.goto(url, { waitUntil: "domcontentloaded" });

      await page.screenshot({ path: process.cwd() + "/ss_full.png" });

      await browser.close();

      await sharp(process.cwd() + "/ss_full.png")
        .resize({
          width:
            req.query.width && /^-?\d+$/.test(req.query.width)
              ? req.query.width
              : 500,
        })
        .toFile(process.cwd() + "/ss.png");

      fs.unlinkSync(process.cwd() + "/ss_full.png");
    } catch (err) {
      return res
        .status(404)
        .send({ message: "Request for theme not found", status: 404 });
    }

    return res.send({
      title,
      description,
      canonical,
      shop,
      locale,
      country,
      currency,
      theme,
      screenshot: "https://" + req.get("host") + "/screenshot",
    });
  } catch (err) {
    return res.status(400).send({ message: "Bad request method", status: 400 });
  }
});

app.get("/screenshot", (_, res) => {
  if (fs.existsSync(process.cwd() + "/ss.png")) {
    res.sendFile(process.cwd() + "/ss.png");

    setTimeout(() => {
      fs.unlinkSync(process.cwd() + "/ss.png");
    }, 5000);

    return;
  }

  return res.status(404).send({ message: "Screenshot not found", status: 404 });
});

app.get("*", (_, res) =>
  res.status(404).send({ message: "Endpoint not found", status: 404 })
);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
