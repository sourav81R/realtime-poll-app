const VOTER_TOKEN_STORAGE_KEY = "pollroom_voter_token";
const VOTER_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;

const generateVoterToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export const getVoterToken = () => {
  const existingToken = localStorage.getItem(VOTER_TOKEN_STORAGE_KEY);
  if (existingToken && VOTER_TOKEN_PATTERN.test(existingToken)) {
    return existingToken;
  }

  const token = generateVoterToken();
  localStorage.setItem(VOTER_TOKEN_STORAGE_KEY, token);
  return token;
};

export const buildVoterHeaders = ({ includeJson = false } = {}) => {
  const headers = {};

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  const authToken = localStorage.getItem("token");
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  headers["X-Voter-Token"] = getVoterToken();
  return headers;
};
