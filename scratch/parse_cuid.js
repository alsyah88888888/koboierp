function parseCuidTime(cuid) {
  if (!cuid || cuid[0] !== 'c') return null;
  const timeStr = cuid.substr(1, 8);
  const timestamp = parseInt(timeStr, 36);
  return new Date(timestamp);
}

const deliveryId = "cmq0v5e4p00myl1tnh74c4us0";
const itemIds = [
  "cmq6cn3py0037l1mhvmmqbb1d",
  "cmq6cn3ub003bl1mhvxl7ofxk",
  "cmq6cn3x6003fl1mh34x3pike",
  "cmq6cn3ze003jl1mhqowpzi6d",
  "cmq6cn41v003nl1mhjdz0s07p",
  "cmq6cn443003rl1mhq02fjus0",
  "cmq6cn46i003vl1mh94bkqq8w",
  "cmq6cn48q003zl1mhq3mqeir9"
];

console.log("Delivery Cuid Time:", parseCuidTime(deliveryId));
itemIds.forEach(id => {
  console.log(`Item Cuid ${id} Time:`, parseCuidTime(id));
});
