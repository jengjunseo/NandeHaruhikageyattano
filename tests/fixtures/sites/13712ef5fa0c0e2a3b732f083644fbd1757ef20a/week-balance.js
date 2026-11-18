'use strict';
window.RingWeekBalance = {
  "status": "design_seed_for_tuning",
  "currency": "JPY",
  "clock": {"unit": "active_second", "grace": 15, "pickupCapacityBase": 1, "pickupCapacityShelf": 2, "queueCapacity": 1},
  "opening": {"cash": 4500, "stock": {"beans": 8, "milk": 5, "cake": 5, "matcha": 3}, "menu": ["coffee", "latte", "cake"], "dailyOverhead": 1950, "cashReserve": 1000},
  "ingredients": {"beans": 130, "milk": 100, "cake": 300, "matcha": 160},
  "menu": {
    "coffee": {"basePrice": 480, "steps": [-2, 3], "recipe": {"beans": 1}, "seconds": 3, "station": "espresso"},
    "latte": {"basePrice": 620, "steps": [-2, 3], "recipe": {"beans": 1, "milk": 1}, "seconds": 5, "station": "espresso"},
    "cake": {"basePrice": 700, "steps": [-2, 3], "recipe": {"cake": 1}, "seconds": 3, "station": "display"},
    "matcha": {"basePrice": 680, "steps": [-2, 3], "recipe": {"matcha": 1, "milk": 1}, "seconds": 4, "station": "mix"},
    "liveSet": {"basePrice": 1050, "steps": [-2, 3], "recipe": {"beans": 1, "cake": 1}, "seconds": 6, "station": "espresso", "days": ["live", "special"], "dailyLimit": {"live": 3, "special": 6}}
  },
  "staff": {"slowAt": 60, "restEvery": 5},
  "priceStep": 50,
  "profiles": {
    "general": {"patience": 26, "maxPriceRatioRange": [0.88, 1.27], "preference": ["latte", "coffee", "cake", "matcha", "liveSet"]},
    "window": {"patience": 31, "maxPriceRatioRange": [0.95, 1.30], "preference": ["matcha", "cake", "latte", "coffee", "liveSet"]},
    "fan": {"patience": 22, "maxPriceRatioRange": [0.94, 1.35], "preference": ["liveSet", "coffee", "latte", "cake", "matcha"], "takeoutChance": 0.7}
  },
  "days": [
    {"day": 1, "type": "sun", "seconds": 65, "visits": 9, "profileWeights": [75, 25, 0], "waves": [100], "fixedFirstOrder": "cake"},
    {"day": 2, "type": "sun", "seconds": 70, "visits": 11, "profileWeights": [70, 30, 0], "waves": [45, 55]},
    {"day": 3, "type": "live", "seconds": 75, "visits": 13, "profileWeights": [48, 20, 32], "waves": [55, 45]},
    {"day": 4, "type": "sun", "seconds": 70, "visits": 11, "profileWeights": [66, 27, 7], "waves": [45, 55]},
    {"day": 5, "type": "rain", "seconds": 70, "visits": 10, "profileWeights": [48, 48, 4], "waves": [45, 55]},
    {"day": 6, "type": "live", "seconds": 75, "visits": 13, "profileWeights": [46, 20, 34], "waves": [55, 45]},
    {"day": 7, "type": "special", "seconds": 75, "visits": 15, "profileWeights": [34, 20, 46], "waves": [55, 45]}
  ],
  "decor": {
    "plant": {"slot": "window", "cost": 0, "day": 1, "unlock": "first_close", "upkeep": 0},
    "chalkboard": {"slot": "entrance", "cost": 350, "day": 1, "unlock": "first_close", "upkeep": 0},
    "windowLamp": {"slot": "window", "cost": 750, "day": 2, "upkeep": 0, "profileWeightPp": 12, "profilePatienceBonus": 3},
    "poster": {"slot": "entrance", "cost": 550, "day": 3, "upkeep": 0, "liveFanExtraVisits": 2, "liveFanWeightPp": 15},
    "pickupShelf": {"slot": "pickup", "cost": 1100, "day": 3, "upkeep": 15, "takeoutServeSeconds": 1},
    "display": {"slot": "display", "cost": 1600, "day": 2, "upkeep": 25, "dessertPreferenceFactor": 1.25},
    "seats": {"slot": "tables", "cost": 1800, "day": 4, "upkeep": 30, "extraSeats": 2, "farServeSeconds": 3},
    "machine": {"slot": "espresso", "cost": 2100, "day": 4, "upkeep": 45, "espressoSecondsSaved": 1},
    "stageLight": {"slot": "stage", "cost": 850, "day": 4, "upkeep": 0},
    "liveMemento": {"slot": "stage", "cost": 0, "day": 7, "unlock": "special_close", "upkeep": 0}
  },
  "scenarios": [
    {"id": "starter", "menu": ["coffee", "latte", "cake"], "decor": ["plant"], "policy": "reserve_then_pickup"},
    {"id": "window", "menu": ["coffee", "matcha", "cake"], "decor": ["windowLamp", "display"], "policy": "seated_and_patience"},
    {"id": "concert", "menu": ["coffee", "latte", "cake", "liveSet"], "decor": ["poster", "pickupShelf"], "policy": "takeout_and_pickup"}
  ],
  "profileOrder": ["general", "window", "fan"]
};
