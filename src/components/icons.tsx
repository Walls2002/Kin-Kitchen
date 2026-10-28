/**
 * The app's icon vocabulary, drawn from Phosphor. Every screen imports icons
 * from here, so one glyph means one thing everywhere and the weight policy
 * lives in one place:
 *  - "regular" by default (Phosphor's 1.5 stroke reads cleanly from 16px up),
 *  - "bold" where a call site asks for a heavier mark (strokeWidth ≥ 2.2, kept
 *    from the previous icon set so call sites read unchanged),
 *  - "duotone" for the selected nav item: a soft cocoa-tinted fill.
 * The server-safe build is used so server and client components share it.
 */
import type { ComponentProps } from "react";
import * as Ph from "@phosphor-icons/react/dist/ssr";

type PhComponent = typeof Ph.Sun;
type PhProps = ComponentProps<PhComponent>;
export type IconProps = Omit<PhProps, "ref"> & { strokeWidth?: number };
export type AppIcon = (props: IconProps) => React.JSX.Element;

function make(C: PhComponent, name: string): AppIcon {
  function AppIconGlyph({ strokeWidth, weight, ...rest }: IconProps) {
    return <C weight={weight ?? (strokeWidth !== undefined && strokeWidth >= 2.2 ? "bold" : "regular")} {...rest} />;
  }
  AppIconGlyph.displayName = name;
  return AppIconGlyph;
}

// Status and direction
export const AlertTriangle = make(Ph.Warning, "AlertTriangle");
export const TriangleAlert = AlertTriangle;
export const ArrowDown = make(Ph.ArrowDown, "ArrowDown");
export const ArrowLeft = make(Ph.ArrowLeft, "ArrowLeft");
export const ArrowRight = make(Ph.ArrowRight, "ArrowRight");
export const ArrowUp = make(Ph.ArrowUp, "ArrowUp");
export const ArrowUpRight = make(Ph.ArrowUpRight, "ArrowUpRight");
export const ExternalLink = make(Ph.ArrowSquareOut, "ExternalLink");
export const Check = make(Ph.Check, "Check");
export const Minus = make(Ph.Minus, "Minus");
export const Plus = make(Ph.Plus, "Plus");
export const X = make(Ph.X, "X");
export const ChevronDown = make(Ph.CaretDown, "ChevronDown");
export const ChevronLeft = make(Ph.CaretLeft, "ChevronLeft");
export const ChevronRight = make(Ph.CaretRight, "ChevronRight");
export const ChevronsUpDown = make(Ph.CaretUpDown, "ChevronsUpDown");
export const CircleDashed = make(Ph.CircleDashed, "CircleDashed");
export const Lock = make(Ph.Lock, "Lock");
export const Repeat = make(Ph.Repeat, "Repeat");
export const RotateCcw = make(Ph.ArrowCounterClockwise, "RotateCcw");
export const Undo2 = make(Ph.ArrowUUpLeft, "Undo2");
export const Redo2 = make(Ph.ArrowUUpRight, "Redo2");

// Actions
export const Search = make(Ph.MagnifyingGlass, "Search");
export const Pencil = make(Ph.PencilSimple, "Pencil");
export const Trash2 = make(Ph.Trash, "Trash2");
export const Download = make(Ph.DownloadSimple, "Download");
export const Share2 = make(Ph.ShareFat, "Share2");
export const Printer = make(Ph.Printer, "Printer");
export const LogOut = make(Ph.SignOut, "LogOut");
export const MailCheck = make(Ph.EnvelopeSimple, "MailCheck");
export const SlidersHorizontal = make(Ph.SlidersHorizontal, "SlidersHorizontal");
export const Ellipsis = make(Ph.DotsThreeOutline, "Ellipsis");

// Kitchen
export const ChefHat = make(Ph.ChefHat, "ChefHat");
export const Flame = make(Ph.Fire, "Flame");
export const Timer = make(Ph.Timer, "Timer");
export const Clock = make(Ph.Clock, "Clock");
export const BellRing = make(Ph.BellRinging, "BellRing");
export const Play = make(Ph.Play, "Play");
export const Pause = make(Ph.Pause, "Pause");
export const Video = make(Ph.PlayCircle, "Video");
export const Sun = make(Ph.Sun, "Sun");
export const Wheat = make(Ph.Grains, "Wheat");
export const ShoppingBag = make(Ph.ShoppingBag, "ShoppingBag");
export const Store = make(Ph.Storefront, "Store");
export const Boxes = make(Ph.Package, "Boxes");
export const Scales = make(Ph.Scales, "Scales");
export const Thermometer = make(Ph.Thermometer, "Thermometer");
export const ArrowsLeftRight = make(Ph.ArrowsLeftRight, "ArrowsLeftRight");

// Design board
export const Palette = make(Ph.Palette, "Palette");
export const Brush = make(Ph.PaintBrush, "Brush");
export const Pen = make(Ph.Pen, "Pen");
export const Highlighter = make(Ph.HighlighterCircle, "Highlighter");
export const Eraser = make(Ph.Eraser, "Eraser");
export const Piping = make(Ph.Drop, "Piping");
export const PaintBucket = make(Ph.PaintBucket, "PaintBucket");
export const Shapes = make(Ph.Cake, "Shapes");
export const Decor = make(Ph.Sparkle, "Decor");
export const Confetti = make(Ph.Confetti, "Confetti");
export const NotebookPen = make(Ph.Notepad, "NotebookPen");
export const Expand = make(Ph.ArrowsOut, "Expand");
export const Shrink = make(Ph.ArrowsIn, "Shrink");

// Sections
export const ListChecks = make(Ph.ListChecks, "ListChecks");
export const ClipboardList = make(Ph.ClipboardText, "ClipboardList");
export const BookOpenText = make(Ph.BookOpenText, "BookOpenText");
export const HandCoins = make(Ph.HandCoins, "HandCoins");
export const Receipt = make(Ph.Receipt, "Receipt");
export const Tag = make(Ph.Tag, "Tag");
export const ReceiptText = Receipt;
export const Landmark = make(Ph.Bank, "Landmark");
export const Wallet = make(Ph.Wallet, "Wallet");
export const CalendarDays = make(Ph.CalendarDots, "CalendarDays");
export const CalendarRange = make(Ph.CalendarBlank, "CalendarRange");
export const PieChart = make(Ph.ChartPieSlice, "PieChart");
export const FileSpreadsheet = make(Ph.FileText, "FileSpreadsheet");
export const TrendingUp = make(Ph.TrendUp, "TrendingUp");
export const LineChart = make(Ph.ChartLine, "LineChart");
export const Settings = make(Ph.GearSix, "Settings");
export const HelpCircle = make(Ph.Question, "HelpCircle");
export const FunctionIcon = make(Ph.Function, "FunctionIcon");
