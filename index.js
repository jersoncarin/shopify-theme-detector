const cheerio = require("cheerio");
const express = require("express");
const ua = new (require("user-agents"))();
const { re, match } = require("./regex");
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
    const description = $('head > meta[name="description"]').text().trim();
    const canonical = $('head > link[rel="canonical"]').text().trim();

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

    return res.send({
      title,
      description,
      canonical,
      shop,
      locale,
      country,
      currency,
      theme,
    });
  } catch (err) {
    return res.status(400).send({ message: "Bad request method", status: 400 });
  }
});

app.get("*", (_, res) =>
  res.status(404).send({ message: "Endpoint not found", status: 404 })
);

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
