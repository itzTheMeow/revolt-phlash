import axios from "axios";
import { load } from "cheerio";

/**
 * Adapted from the urban-eng-dictionary module. The module was removed from NPM.
 */

async function getUrbanDictionary(term: string) {
  const result = await axios.get(`https://www.urbandictionary.com/define.php?term=${term}`);

  const { data } = result;

  const $ = load(data);

  const meaning = $(".meaning");

  const defination = [];

  for (let i = 0; i < meaning.length; i++) {
    defination.push($(meaning.get(i)).text());
  }

  return defination;
}

export default getUrbanDictionary;
