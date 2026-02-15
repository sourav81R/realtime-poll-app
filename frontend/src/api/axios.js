import axios from "axios";
import { BACKEND_URL } from "../socket";

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

export default API;
