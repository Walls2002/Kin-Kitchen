/**
 * The words of the "How to use" manual. Kept as plain strings so the search
 * box can filter them; a tiny markup is rendered by guide.tsx:
 *   **Label**  → a bold UI label, exactly as it reads on screen
 *   [[Enter]]  → a keyboard key chip
 *   {{npm start}} → a command or file name in code type
 * Every label here was copied from the real screens. When a screen changes,
 * change its chapter too.
 */
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  ChefHat,
  ClipboardList,
  HandCoins,
  Landmark,
  ListChecks,
  Lock,
  Palette,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sun,
  Wheat,
  type AppIcon,
} from "@/components/icons";

export interface GuideTask {
  title: string;
  steps: string[];
}

export interface GuideFaq {
  q: string;
  a: string[];
}

export interface Chapter {
  id: string;
  title: string;
  icon: AppIcon;
  /** One line: what this part of the app is for. */
  what: string;
  /** Optional plain paragraphs before the tasks. */
  intro?: string[];
  tasks: GuideTask[];
  faq?: GuideFaq[];
  tips: string[];
  go?: { href: string; label: string };
}

export const INTRO =
  "Kin Kitchen keeps your pantry, recipes, orders and money in one place. Most things link up on their own: a recipe's cost follows your ingredient prices, a payment on an order becomes income, marking an order done takes its ingredients out of the pantry, and recording a pantry purchase writes the expense for you. So you type each thing once, where it happens, and the reports fill themselves in.";

export const FIRST_WEEK: { id: string; title: string; body: string; chapter: string }[] = [
  {
    id: "data",
    title: "Check whose data you're looking at",
    body: "A **Sample data** strip at the top means practice data that resets. Try anything you like, then connect Supabase so your own records are kept.",
    chapter: "setup",
  },
  {
    id: "pantry",
    title: "Put in your ingredients and their prices",
    body: "The flour, sugar, butter and boxes you buy most: what a pack costs, how big it is, and how much you have.",
    chapter: "ingredients",
  },
  {
    id: "recipe",
    title: "Add one recipe, with its steps",
    body: "What one batch uses, how many it makes and your price. Add the method too, so Bake mode can walk you through it.",
    chapter: "recipes",
  },
  {
    id: "order",
    title: "Record your next order",
    body: "Who it's for, the items, the due date, and the deposit when it comes in.",
    chapter: "orders",
  },
  {
    id: "done",
    title: "Mark that order done",
    body: "When it leaves the kitchen, tap **Mark done**. Its ingredients come out of stock on their own.",
    chapter: "orders",
  },
  {
    id: "expenses",
    title: "Record the week's spending",
    body: "Bills and receipts in Expenses; restocks with **Record a purchase** on the ingredient.",
    chapter: "expenses",
  },
  {
    id: "today",
    title: "Start each day on Today",
    body: "Orders due, today's tasks, what's running low and the next BIR deadline, on one page.",
    chapter: "today",
  },
];

export const CHAPTERS: Chapter[] = [
  {
    id: "today",
    title: "Today",
    icon: Sun,
    what: "Your morning page: what's due, what's left to do, and how the month is going.",
    tasks: [
      {
        title: "Read the morning",
        steps: [
          "Open **Today**. The line under the heading says how many orders are due today and how many tasks are left.",
          "The four figures across the top are **Sales this month**, **Profit so far**, **To collect** and **Due this week**. Tap one to open the list or report behind it.",
          "**Orders due** shows the next seven days, grouped as Overdue, Today, Tomorrow and then by day. Tap **Start baking** or **Mark done** right on the row.",
          "Tick jobs off in **Today's tasks** as you go.",
          "**Running low** lists the ingredients at or below their low level. Tap one to open it and restock.",
          "When a BIR return is coming up, a line shows the form, when it's due and the estimated amount. Tap it to open Tax.",
        ],
      },
      {
        title: "Start something new from here",
        steps: [
          "On a PC, use **New order** or **Add expense** at the top right.",
          "On a phone, tap the round **Order** button above the tab bar.",
        ],
      },
    ],
    tips: [
      "**Sales this month** is compared with the same days of last month, so the middle of a month isn't measured against a whole one.",
      "**Profit so far** is after expenses and the 8% tax estimate.",
      "Changing an order's status here shows a message with **Undo**, the same as on the order itself.",
    ],
    go: { href: "/", label: "Go to Today" },
  },
  {
    id: "ingredients",
    title: "Inventory",
    icon: Wheat,
    what: "Your pantry as a spreadsheet: one row per ingredient, with what it costs and how much you have.",
    tasks: [
      {
        title: "Find your way around the sheet",
        steps: [
          "It works like Google Sheets: column letters across the top (A, B, C…) and row numbers down the left. The columns are Ingredient, Category, Supplier, Pack size, Unit, Pack price, Cost per unit, In stock and Low at.",
          "Click a cell to select it. The name box above the grid shows which cell you're on (for example F4), and the formula bar beside it shows what's in it.",
          "The category tabs along the bottom work like sheet tabs: **All items** first, then one tab per category. Click a tab to see only that category.",
          "To narrow the list, use **Search** and the **Supplier** and **Running low** filters in the toolbar above the grid.",
        ],
      },
      {
        title: "Change a price or a stock count",
        steps: [
          "Select the cell, then double-click it, press [[Enter]] or [[F2]], or just start typing.",
          "You can also click into the formula bar and type there.",
          "Press [[Enter]] to save and move down, or [[Tab]] to save and move right. [[Esc]] cancels. The arrow keys move between cells.",
          "Type amounts with their unit if you like: 25 kg, 500 g, 1.5 L.",
          "A message at the bottom confirms each save. Tap **Undo** in it to put the old value back.",
        ],
      },
      {
        title: "Add an item",
        steps: [
          "Click the **+** at the left of the category tabs. On a PC you can also use **Add item** at the top right; on a phone, the round **Add** button.",
          "Give it a **Name**, a **Category**, the **Package size** and **Unit** (g, kg, ml, L or pc) and the **Package price**. The cost per g, ml or piece appears as you type.",
          "**Supplier**, **In stock**, **Low at** and **Notes** are optional, but **Low at** is what makes the row turn yellow when you're running out.",
          "Tap **Add item** to save it.",
        ],
      },
    ],
    tips: [
      "The **Cost per unit** column is locked: Kin Kitchen works it out for you as price ÷ size.",
      "When **In stock** drops to **Low at** or below, the stock cell turns yellow with LOW, and the ingredient shows under Running low on Today.",
      "Changing a price, pack size or supplier adds a line to that ingredient's price history, and every recipe that uses it is repriced on its own.",
      "On a phone, swipe the sheet sideways to see the other columns.",
    ],
    go: { href: "/ingredients", label: "Go to Inventory" },
  },
  {
    id: "purchases",
    title: "Record a purchase and price history",
    icon: ShoppingBag,
    what: "When you restock, record it once: the stock goes up, the cost lands in Expenses, and a new price goes into the history.",
    tasks: [
      {
        title: "Record a purchase",
        steps: [
          "Open the ingredient: from its row on the Inventory sheet, or by tapping it under Running low on Today.",
          "Tap **Record a purchase**.",
          "Set **Packs bought** with the − and + buttons. Part packs such as 1.5 are fine.",
          "Check **Price per pack**. It starts at the current price; change it if you paid something different.",
          "Check the **Date**, and pick the **Supplier** if you want it recorded.",
          "Read the line underneath, for example \"Adds 2 × 25 kg = 50 kg · ₱2,770 expense\", then tap **Record purchase**.",
        ],
      },
      {
        title: "Change the stock without a purchase",
        steps: [
          "On the ingredient's page, tap **Add**, **Use** or **Set** under In stock.",
          "Type the amount, or tap a quick choice like **1 pack**. **Set exact** is for after you've counted the shelf.",
          "Check **New stock**, then tap **Save stock**. The message that follows has **Undo**.",
        ],
      },
      {
        title: "Add an old receipt to the history",
        steps: [
          "Under Price history, tap **Add a past price**.",
          "Fill in **Receipt date**, **Package size**, **Price paid** and, if you like, **Supplier**.",
          "Tap **Add to history**. It goes in at that date and doesn't change today's price.",
        ],
      },
    ],
    tips: [
      "**Undo** on the purchase message removes the expense and takes the packs back out of stock. If the price changed, the new price stays in the history.",
      "Purchases of anything in your Packaging category are filed under Packaging in Expenses; everything else under Ingredients.",
      "The price history writes itself whenever the price, size or supplier changes. The chart above it steps at each recorded price.",
      "Deleting an ingredient can't be undone and takes its price history with it. Export a CSV from Settings first if you want to keep it.",
    ],
    go: { href: "/ingredients", label: "Go to Inventory" },
  },
  {
    id: "recipes",
    title: "Recipes and pricing",
    icon: BookOpenText,
    what: "Work out what each product really costs to make, and what to charge for it.",
    tasks: [
      {
        title: "Price a new recipe",
        steps: [
          "Open **Recipes** and tap **New recipe** (on a phone, the round **Recipe** button).",
          "Under Product, give it a **Name**, then fill in **One batch makes** (for example 12) and **One unit is called** (pc, box of 12, whole cake).",
          "Under Ingredients for one batch, type into \"Add an item: search the pantry\". Pick with [[↑]] [[↓]] and [[Enter]], or tap it.",
          "The cursor jumps to the amount. Type it like 250 g, 1.5 kg or 3 pc.",
          "Under Price and running costs, fill in **Selling price**, **Profit on cost** (it starts at 50%, so the price is the cost plus half), **Labor per batch** and **Overhead per batch** (gas, electricity, wear).",
          "Watch the price label: cost per unit, batch cost, profit and profit on cost update as you type. **Suggested price** is your cost plus your **Profit on cost** (50% means cost × 1.5), rounded up to the next ₱5; tap **Use this price** to take it.",
          "Tap **Add recipe** to save it, or **Save recipe** after changes.",
        ],
      },
      {
        title: "Quote a bulk order",
        steps: [
          "On a recipe, find **Quote a bulk order**.",
          "Type the quantity in **How many?**. You'll see the total price, total cost, total profit and how many batches to bake.",
        ],
      },
      {
        title: "Compare your products",
        steps: [
          "The Recipe pricing list shows each product's **Price**, **Cost per unit**, **Profit per unit**, **Margin** and **Suggested price**.",
          "A product earning less than its profit on cost shows an \"under 50%\" tag (or whatever target you set).",
          "Click a column heading to sort by it; click again to reverse.",
        ],
      },
    ],
    tips: [
      "Costs follow today's ingredient prices. Change a price on the Inventory sheet and every recipe that uses it updates.",
      "Switch off **On the menu** to hide a product from the order picker. Past orders keep it.",
      "Orders keep their own copy of the price, so deleting a recipe doesn't change past orders or income. The delete message has **Undo**.",
      "If an ingredient was removed from the pantry, the recipe line reads \"Removed ingredient\" and counts as ₱0 until you replace it.",
    ],
    go: { href: "/recipes", label: "Go to Recipes" },
  },
  {
    id: "bake",
    title: "Bake mode",
    icon: ChefHat,
    what: "A full-screen, one-step-at-a-time view for the kitchen, with the ingredients in sight and timers that ring.",
    tasks: [
      {
        title: "Write the method first",
        steps: [
          "Open the recipe and scroll to **Method**.",
          "Tap **+ Add step** and write one step per card.",
          "If a step needs time in the oven or to rise, type the minutes in the timer box beside it.",
          "Save the recipe.",
        ],
      },
      {
        title: "Bake a recipe",
        steps: [
          "Open Bake mode: **Start baking** on the recipe, the chef's hat beside it in the Recipe pricing list, or **Bake this** next to an item on an order.",
          "The **Get ready** screen lists what to set out. When it's all on the counter, tap **Start**.",
          "Read the step in large type. Move with **Next step** and **Back**, or swipe left and right. On a keyboard, [[→]] and [[←]] move, and [[Space]] or [[Enter]] goes to the next step.",
          "When a step has a time, tap **Start 45 min timer** (it shows that step's minutes). Timers keep running while you move on; each one shows as a small pill at the top. Tap a pill to pause or resume it; press and hold to cancel it.",
          "When a timer ends, the screen shows \"Step 3 is done\" and beeps (and vibrates on phones that can). Tap **Stop alarm**.",
          "On the last step tap **Finish**. If anything else is waiting to be baked, the next one opens by itself after a few seconds: first the rest of the same order, then the next order by due date. Tap **Stay here** to stop it, or **Bake next** to go now. It waits for you while a timer is still running.",
        ],
      },
    ],
    tips: [
      "The screen stays on while Bake mode is open (the sun mark says \"Screen stays on\"). If your browser can't do that, a message tells you to keep the screen on in your phone settings.",
      "Leave and come back and it asks \"Pick up at step 4?\". Tap **Continue** or **Start over**. Your place is kept on this device for two days.",
      "The alarm only rings while Bake mode is open, so keep it on screen while timers run.",
      "When every product of an order is baked, the last screen offers **Mark order done**, which takes its ingredients out of the pantry (with Undo). Amounts are for one batch.",
    ],
    go: { href: "/recipes", label: "Go to Recipes" },
  },
  {
    id: "orders",
    title: "Orders",
    icon: ClipboardList,
    what: "Every order from the first message to pickup: what they want, when, what they've paid, and what it costs you.",
    tasks: [
      {
        title: "Take a new order",
        steps: [
          "Tap **New order** (on a phone, the round **Order** button).",
          "Under Customer, type the **Name**. Past customers are suggested and fill in the **Contact** for you. Set **Came in through**, **Ordered on** and **Due**.",
          "Under Items, type into \"Add an item: search your recipes\" and pick one. Picking the same recipe again adds one more.",
          "For something that isn't a recipe, pick **+ Custom item**. It has no recipe cost and uses nothing from the pantry.",
          "Set each item's quantity with − and +, and check **Price each**.",
          "Add a **Delivery fee** or **Discount** if there is one, and **Notes** (dedication, pickup time, allergies, address).",
          "Tap **Add order**.",
        ],
      },
      {
        title: "Record a deposit or a payment",
        steps: [
          "Open the order. Under Payments, tap **+ Record payment**. It starts with the balance still owed, today's date and GCash.",
          "Change **Amount received**, **Paid by** and **Date received** to match. A deposit is simply a payment for part of the total.",
          "Tap **Save order**. Payments are only kept once the order is saved.",
        ],
      },
      {
        title: "Move an order along",
        steps: [
          "Orders go **To do** → **Baking** → **Done**. Use **Start baking**, then **Mark done**, on the Orders list, on Today, or at the top of the order.",
          "Marking it done takes the recipes' ingredients out of the pantry. The message says how many, and **Undo** puts back exactly what was taken.",
          "**Cancel order** if it falls through. **Reopen** brings a done or cancelled order back, and returns its ingredients to the pantry.",
        ],
      },
      {
        title: "Find an order",
        steps: [
          "Use the tabs **Upcoming**, **Done**, **Cancelled** and **All**. Upcoming is grouped by due day, with Overdue first.",
          "Search by customer, item or #number, or pick a channel. **Clear** resets the filters.",
        ],
      },
    ],
    tips: [
      "Payments you record on an order are your income on the day received. Don't type them again in Income.",
      "The **From the pantry** panel on an open order shows what it will use, and warns \"Short by…\" or \"LOW after this order\" before you start.",
      "A balance turns red only when the order is due today or late and still owes money.",
      "Deleting an order has **Undo**. Its payments come off your income, and if it was done, its ingredients go back.",
    ],
    go: { href: "/orders", label: "Go to Orders" },
  },
  {
    id: "designs",
    title: "Cake designs",
    icon: Palette,
    what: "Sketch a customer's cake, keep it with their order, and send it to them as a picture.",
    tasks: [
      {
        title: "Draw a design",
        steps: [
          "Open the order and tap **Draw the cake design** in its Cake design panel. Or start from the gallery with **New design** or **Start a design**.",
          "Pick a cake shape (round from above or the side, two or three tiers, sheet, square tiers, heart, drip, bento box, a number 0 to 9, cupcakes, or a blank board), or a **Theme cake** (Birthday, Unicorn, Princess, Dinosaur, Floral wedding, Baby shower, Christmas) that starts decorated.",
          "Draw with your finger, a stylus or the mouse. **Pen** [[P]] is a plain line, **Marker** [[M]] is wide and see-through like icing, and **Eraser** [[E]] removes any line you drag across.",
          "**Piping** [[I]] lays real piping-tip shapes: drag for a run, tap for one. Each tip shows its Wilton number (1M rosette, 2D drop flower, 104 rose and ruffle, 352 leaf, 233 grass, 48 basket weave and more). **Pipe the border** goes all round the cake.",
          "**Decor** [[D]] places toppers and words (type your own greeting), number candles, candles, sweets and cartoon figures. Tap to place one; drag a placed one to move it. The Eraser removes it.",
          "Pick an icing colour (or **More colours**) and a size: **Fine**, **Medium** or **Thick** (Small, Medium or Large for Decor).",
          "**Undo** is [[Ctrl]] + [[Z]] and **Redo** is [[Ctrl]] + [[Shift]] + [[Z]]. **Clear** empties the board, with **Undo** in the message.",
          "Name it at the top, and tap **Notes** for the greeting text, flavours and filling.",
        ],
      },
      {
        title: "Draw the top and the side",
        steps: [
          "Tap **Add a view** at the top left of the board and pick a shape, such as Round cake from the side after drawing the top.",
          "Each view is its own drawing with its own Undo. Tap a view's tab to switch.",
          "Changing the shape of a view with drawing on it asks first: **Add as a new view** keeps the drawing, **Replace and clear** starts that view again.",
          "The order, Bake mode and **Share picture** show every view together.",
        ],
      },
      {
        title: "Attach it and send it",
        steps: [
          "Use **Attach to order** at the top to link the design to an open order.",
          "Tap **Share picture** (**Share** on a phone). Your phone's share sheet opens so you can send it on Messenger or anywhere else. On a PC, the picture downloads instead.",
        ],
      },
    ],
    tips: [
      "Designs save as you draw. Look for **Saved** at the top; if it says **Couldn't save · Retry**, tap it.",
      "In Bake mode, a **Design** button shows the order's designs full screen while you decorate.",
      "Replaced a view by mistake? Tap **Undo** in the message, or [[Ctrl]] + [[Z]].",
      "The gallery shows **For upcoming orders** or **All designs**. Deleting a design has **Undo**.",
    ],
    go: { href: "/designs", label: "Go to Cake designs" },
  },
  {
    id: "income",
    title: "Income",
    icon: HandCoins,
    what: "All the money that comes in. Order payments appear on their own; you only add other sales.",
    tasks: [
      {
        title: "Add a sale that isn't an order",
        steps: [
          "Tap **Add a row** (on a phone, the round **Income** button).",
          "Fill in **Description**, **Date**, **Amount** and **Channel**.",
          "Press [[Enter]] in any cell, or tap **Add income**.",
        ],
      },
      {
        title: "Fix or remove a row",
        steps: [
          "Click a cell, change it, and press [[Enter]] to save. The message has **Undo**.",
          "The bin icon at the end of a row deletes it, with **Undo** in the message.",
          "Narrow the list with the month and source filters (**All income**, **From orders**, **Other income**) or **Search**.",
        ],
      },
    ],
    tips: [
      "Rows with a lock are order payments. To change one, follow its **Order #** link and change the payment on the order.",
      "**To collect** at the top is what customers still owe on their orders.",
      "The chart at the bottom shows the year's income by channel. Every chart has a **Show as table** option.",
    ],
    go: { href: "/income", label: "Go to Income" },
  },
  {
    id: "expenses",
    title: "Expenses",
    icon: ReceiptText,
    what: "Receipts, bills and pantry purchases, sorted into categories.",
    tasks: [
      {
        title: "Add a receipt or bill",
        steps: [
          "Tap **Add a row** (on a phone, the round **Expense** button). Today also has **Add expense**.",
          "Fill in **Description**, **Date**, **Amount**, **Category** and, if you like, **Payee**.",
          "Press [[Enter]] in any cell, or tap **Add expense**.",
        ],
      },
      {
        title: "Find pantry purchases",
        steps: [
          "Purchases you record on an ingredient arrive here on their own, with a **Pantry** tag.",
          "Type \"pantry\" in **Search** to see only those.",
        ],
      },
    ],
    tips: [
      "Ingredients and Packaging count as cost of goods in your reports; every other category is an operating expense.",
      "Editing or deleting a row shows a message with **Undo**.",
      "To take back a pantry purchase together with its stock, use **Undo** right after recording it on the ingredient.",
    ],
    go: { href: "/expenses", label: "Go to Expenses" },
  },
  {
    id: "tax",
    title: "Tax",
    icon: Landmark,
    what: "Follow the BIR 8% income tax option: what you owe, when each return is due, and what you've paid.",
    intro: [
      "Under the 8% option you pay 8% of gross sales above ₱250,000 a year, in place of graduated income tax and the 3% percentage tax. You file 1701Q for each of the first three quarters (due May 15, Aug 15 and Nov 15) and 1701A by April 15 of the next year. The option only applies while gross sales stay at or under ₱3,000,000 a year.",
    ],
    tasks: [
      {
        title: "See what's due",
        steps: [
          "Open **Tax**. The figures at the top are **Gross sales**, **Tax for the year**, **Paid so far** and **Next deadline**. Use ‹ and › to change the year.",
          "**Returns for** the year lists each 1701Q and the 1701A, with the tax due, what's paid, the balance and the deadline.",
          "The status reads **Still adding up** (the quarter hasn't ended), **Due**, **Overdue**, **Paid** or **Nothing due**. With nothing due, you still file the return.",
        ],
      },
      {
        title: "Record a tax payment",
        steps: [
          "Tap **Record payment** on the return's row.",
          "Check **Amount paid** (it starts at the balance) and **Paid on**, and add the **Reference no.** from eBIRForms or the bank.",
          "Tap **Record payment**. The message has **Undo**.",
        ],
      },
    ],
    tips: [
      "Every figure here is an estimate from what you've recorded. Confirm with your RDO or accountant before you file.",
      "Gross sales come from Income, meaning order payments plus other sales, so record every sale.",
      "The VAT threshold bar warns you when sales reach 80% of ₱3,000,000.",
      "Payments are listed under **Payments for** the year. The bin icon deletes one, with **Undo**.",
    ],
    go: { href: "/tax", label: "Go to Tax" },
  },
  {
    id: "reports",
    title: "Reports",
    icon: CalendarDays,
    what: "See how the business is doing by month, by year, by product, and over five years.",
    tasks: [
      {
        title: "Look at a month or a year",
        steps: [
          "Open **Monthly**. The tabs along the top are **Monthly**, **Annual**, **Products**, **Statements** and **5-year growth**.",
          "Use ‹ and › beside the date to go back or forward.",
          "Monthly shows Revenue, Expenses, Net profit and Orders done, then Day by day, Profit and loss, Where the money went, Top products and Sales channels.",
          "Annual shows the year Month by month, with a Monthly figures table underneath.",
        ],
      },
      {
        title: "Compare products",
        steps: [
          "Open **Products** and choose a **Time range**: This month, Quarter, This year, 12 months or All time.",
          "Read **Best sellers** and **Most profitable**, then the **Side by side** table. Click a column heading to sort.",
          "**Volume vs margin** sorts products into Popular and profitable, Popular, thin margin, Rare but rich, and Rethink.",
        ],
      },
      {
        title: "Make your own dashboard",
        steps: [
          "At the bottom of Products, under **Your dashboards**, tap **New view**.",
          "Pick a **Measure** (Revenue, Profit, Units sold, Orders, Expenses or Margin), how to **Split by** it (product, month, channel and so on) and the **Time**.",
          "Keep the suggested **Name** or type your own, check the **Preview**, and tap **Save view**.",
          "It stays there and updates itself. **Edit** changes it; **Delete** removes it, with **Undo**.",
        ],
      },
      {
        title: "Read the statements",
        steps: [
          "Open **Statements** and switch between **Income statement** and **Balance sheet**.",
          "The income statement shows a **Month**, **Quarter** or **Year** beside the one before: revenue, cost of goods, gross profit, operating expenses, the tax estimate and net income.",
          "On the balance sheet, lines with a lock are worked out for you: Inventory (pantry stock at today's cost), Receivables (unpaid balances on finished orders), Income tax payable and Net income to date.",
          "Type the rest yourself with **Add item**: cash and bank, equipment, loans, payables, capital put in and owner draws. Click a name or amount to change it; [[Enter]] saves, [[Esc]] cancels.",
          "**Print** prints the statement on its own.",
        ],
      },
      {
        title: "See five years at once",
        steps: [
          "Open **5-year growth** for this year and the four before it: year by year, the same months every year, and a table with growth per year.",
        ],
      },
    ],
    tips: [
      "Product figures count only orders marked done, by their due date.",
      "**Not yet matched** on the balance sheet is the gap your records don't explain, usually cash not counted, a draw or purchase not recorded, or equipment bought before you started. Add the missing item and it shrinks.",
      "The statements are cash basis: a sale counts when it's paid, and ingredients and packaging count in the month you buy them.",
      "Every chart has **Show as table** if you'd rather read the figures.",
    ],
    go: { href: "/reports/monthly", label: "Go to Reports" },
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: ListChecks,
    what: "Daily and weekly jobs that come back on their own, and one-offs that stay until you tick them.",
    tasks: [
      {
        title: "Add a task",
        steps: [
          "Tap **Add a task** (on a phone, the round **Task** button).",
          "Type **What needs doing** and pick the **Area**.",
          "Under **Repeats**, pick **Once** (with an optional **Due** date), **Every day** or **Every week** (and **On** which day).",
          "Tap **Add task**.",
        ],
      },
      {
        title: "Tick it off",
        steps: [
          "Tap the circle beside the task. It moves to **Done**, and the message has **Undo**.",
          "To change or delete a task, tap its pencil.",
        ],
      },
    ],
    tips: [
      "Tasks sit under **Today**, **Later this week** or **Later and someday**. A late one says how many days late in red.",
      "Daily tasks come back unticked every morning; weekly ones on their day.",
      "**Orders to get ready** beside the list shows orders due today and tomorrow.",
    ],
    go: { href: "/tasks", label: "Go to Tasks" },
  },
  {
    id: "settings",
    title: "Settings and backups",
    icon: Settings,
    what: "Your ingredient categories, monthly backups, and putting Kin Kitchen on your phone.",
    tasks: [
      {
        title: "Set up your categories",
        steps: [
          "Open **Settings**. Under Categories, type a new name and tap **Add**.",
          "Use the arrows to move a category up or down; that's the order categories show in menus.",
          "Rename or delete with the buttons on its row. Ingredients in a deleted category become Uncategorized.",
        ],
      },
      {
        title: "Back up once a month",
        steps: [
          "Under **Export to CSV**, tap each button: Ingredients, Price history, Recipes, Orders, Income, Expenses and Tax payments.",
          "Keep the files somewhere safe. Each one opens in Excel or Google Sheets.",
        ],
      },
      {
        title: "Install on your phone",
        steps: [
          "On Android, open the browser menu and choose **Install app**.",
          "On iPhone, tap **Share**, then **Add to Home Screen**.",
        ],
      },
    ],
    tips: [
      "The free database has no point-in-time backups, so the monthly export is your safety net.",
      "Deleting or renaming a category has no Undo.",
      "**Log out** is under Account.",
    ],
    go: { href: "/settings", label: "Go to Settings" },
  },
  {
    id: "setup",
    title: "Sample data and connecting Supabase",
    icon: Lock,
    what: "Practise on sample data first, then connect your own private database so your records are kept.",
    intro: [
      "When the strip at the top says **Sample data**, Kin Kitchen is running on a made-up bakery: about 35 ingredients, 9 recipes and months of orders and bills. Nothing you change is kept. It resets when the app restarts.",
      "To keep your own records, whoever set up the app connects it to a free Supabase database once. These steps are from the project's README.",
    ],
    tasks: [
      {
        title: "Connect Supabase",
        steps: [
          "Create a free project at supabase.com.",
          "In its SQL editor, run the files in {{supabase/migrations}} in order, {{0001_init.sql}} through {{0006_design_views.sql}}.",
          "Copy {{.env.example}} to {{.env.local}} and fill in {{NEXT_PUBLIC_SUPABASE_URL}}, {{NEXT_PUBLIC_SUPABASE_ANON_KEY}} and {{NEXT_PUBLIC_SITE_URL}}.",
          "In Supabase, under Authentication → URL configuration, add your site's address followed by {{/auth/callback}} to the redirect URLs.",
          "Restart Kin Kitchen. The Sample data strip disappears and you'll see the log-in page.",
          "Type your **Email** and tap **Email me a sign-in link**, then open the link on the same device. To use a password instead, create the user with a password in Supabase first, then tap **Use a password instead**.",
        ],
      },
    ],
    tips: [
      "The first time you log in, the starter categories are made for you.",
      "Free Supabase projects pause after about a week with no use. The project's keep-alive check prevents that once the app is online.",
      "Your data is private to your login. Export a CSV backup from Settings every month.",
    ],
    go: { href: "/settings", label: "Go to Settings" },
  },
  {
    id: "help",
    title: "Troubleshooting",
    icon: AlertTriangle,
    what: "Quick answers when something doesn't look right.",
    tasks: [],
    faq: [
      {
        q: "Pages are slow to open.",
        a: [
          "If the app was started with {{npm run dev}}, it's in development mode and builds each page the first time you open it. For everyday use, stop it and run {{npm run build}} and then {{npm start}}. Pages open much faster that way.",
        ],
      },
      {
        q: "A red \"Couldn't save\" or \"Didn't save\" message appeared.",
        a: [
          "Nothing was changed. Usually the connection dropped: check your signal and try again.",
          "If a cell got a red outline, the message says what to fix, for example \"Type an amount, like 1,250 or 95.50\".",
        ],
      },
      {
        q: "\"Couldn't load this page.\"",
        a: ["Kin Kitchen needs a connection to reach your data. Check your signal, then tap **Try again**."],
      },
      {
        q: "I changed something by mistake.",
        a: [
          "Most changes show a message at the bottom with **Undo**. It stays for about six seconds.",
          "A few things have no Undo: adding a new row (delete it instead), deleting an ingredient, and deleting or renaming a category.",
        ],
      },
      {
        q: "An order didn't take anything out of the pantry.",
        a: [
          "Only recipe items use stock; custom items don't. Stock comes out only when the order is marked done, and never goes below zero. If something was short, the message names it.",
        ],
      },
      {
        q: "Where is my data kept?",
        a: [
          "On sample data, in the app's memory, and it resets on restart. Once connected, in your own Supabase database, behind your log-in.",
          "Two small things live only in the browser you're using: your place in Bake mode and the ticks on the first-week checklist on this page.",
        ],
      },
    ],
    tips: [
      "Tax figures look off? They're built from Income, so check that every payment and sale is recorded.",
      "A recipe line saying \"Removed ingredient\" counts as ₱0. Replace it so the cost is right.",
    ],
  },
];

/** Plain text of a chapter, for search. */
export function chapterText(c: Chapter) {
  return [
    c.title,
    c.what,
    ...(c.intro ?? []),
    ...c.tasks.flatMap((t) => [t.title, ...t.steps]),
    ...(c.faq ?? []).flatMap((f) => [f.q, ...f.a]),
    ...c.tips,
  ]
    .join(" ")
    .replace(/\*\*|\[\[|\]\]|\{\{|\}\}/g, "")
    .toLowerCase();
}
