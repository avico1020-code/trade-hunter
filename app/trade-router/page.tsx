"use client";

import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { AIChatPanel } from "@/components/main-screen/AIChatPanel";
import { StrategyKitHeader } from "@/components/strategy-kit/StrategyKitHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ScanningAccordionContent() {
  const [mounted, setMounted] = useState(false);

  // Scanner state
  const [minMasterScore, setMinMasterScore] = useState<string>("6.0");
  const [maxSymbolsToScan, setMaxSymbolsToScan] = useState<string>("20");
  const [requireClosedCandle, setRequireClosedCandle] = useState<boolean>(true);
  const [debounceMs, setDebounceMs] = useState<string>("2000");
  const [enableDirectionFilter, setEnableDirectionFilter] = useState<boolean>(true);
  const [activeStrategies, setActiveStrategies] = useState<string[]>([]);

  // Strategy Context - detailed configuration per strategy
  const [strategyContext, setStrategyContext] = useState<
    Record<string, { enabled: boolean; direction: "LONG" | "SHORT" | "BOTH"; priority: string }>
  >({
    DOUBLE_TOP: { enabled: true, direction: "SHORT", priority: "1" },
    DOUBLE_BOTTOM: { enabled: true, direction: "LONG", priority: "1" },
    BREAKOUT: { enabled: true, direction: "LONG", priority: "2" },
    GAP_FILL: { enabled: true, direction: "BOTH", priority: "3" },
    REVERSAL: { enabled: true, direction: "BOTH", priority: "2" },
  });

  // Backtest state
  const [backtestEnabled, setBacktestEnabled] = useState<boolean>(false);
  const [backtestIncludePremarket, setBacktestIncludePremarket] = useState<boolean>(false);
  const [backtestIncludeAfterHours, setBacktestIncludeAfterHours] = useState<boolean>(false);
  const [backtestDays, setBacktestDays] = useState<string>("30");
  const [backtestIgnoreMasterScore, setBacktestIgnoreMasterScore] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-right space-y-4">
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="w-full space-y-0">
        <AccordionItem value="scanner-config" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            הגדרות סורק התבניות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מערכת הסריקה מזהה תבניות מסחר טכניות על מניות
                  שדורגו גבוה במערכת הניקוד. המערכת מנתחת נתוני שוק בזמן אמת, מפעילה אסטרטגיות זיהוי
                  תבניות שונות (כגון Double Top, Breakout, Gap Fill), ומסננת את התוצאות לפי כיוון,
                  נרות סגורים, ואנטי-ספאם. המערכת משתמשת ב-RealTimeDataClient לקבלת נתוני שוק
                  וב-MasterScoringClient לקבלת רשימת המניות המובילות. כל תבנית שזוהתה נשלחת כמסר
                  למערכת הביצועים לכניסה לעסקה.
                </p>
              </div>

              {/* תוכן האופציות יוזן כאן */}
              <div className="text-muted-foreground">
                <p>תוכן האופציות יוזן כאן במהלך התכנון</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="strategies" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            אסטרטגיות זיהוי תבניות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקה זו כוללת את כל האסטרטגיות לזיהוי תבניות מסחר.
                  כל אסטרטגיה ממומשת לפי ממשק IPatternStrategy ומגדירה את כיוון המסחר שלה (LONG,
                  SHORT, או BOTH). האסטרטגיות מזהות תבניות טכניות בנתוני המחיר והנפח ומחזירות
                  PatternDetectionResult המכיל מידע על התבנית שזוהתה, מחיר כניסה מוצע, וסטופ-לוס
                  מוצע.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <Label>קונפיגורציה מפורטת לכל אסטרטגיה</Label>
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      הגדר לכל אסטרטגיה: האם מופעלת, כיוון מותר, וסדר עדיפות
                    </p>
                  </div>

                  {/* Strategy Context Configuration */}
                  {Object.keys(strategyContext).map((strategyName) => {
                    const strategy = strategyContext[strategyName];
                    return (
                      <div
                        key={strategyName}
                        className="border border-border rounded-lg p-4 space-y-4"
                      >
                        <h4 className="text-lg font-semibold">{strategyName}</h4>

                        {/* Enabled Toggle */}
                        <div className="space-y-2">
                          <Label>מופעלת?</Label>
                          <div className="flex justify-end gap-3">
                            <Button
                              type="button"
                              variant={strategy.enabled ? "default" : "outline"}
                              className="max-w-md"
                              onClick={() => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: { ...prev[strategyName], enabled: true },
                                }));
                              }}
                            >
                              כן
                            </Button>
                            <Button
                              type="button"
                              variant={!strategy.enabled ? "default" : "outline"}
                              className="max-w-md"
                              onClick={() => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: { ...prev[strategyName], enabled: false },
                                }));
                              }}
                            >
                              לא
                            </Button>
                          </div>
                        </div>

                        {/* Direction */}
                        <div className="space-y-2">
                          <Label>כיוון מותר</Label>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant={strategy.direction === "LONG" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: { ...prev[strategyName], direction: "LONG" },
                                }));
                              }}
                            >
                              LONG
                            </Button>
                            <Button
                              type="button"
                              variant={strategy.direction === "SHORT" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: { ...prev[strategyName], direction: "SHORT" },
                                }));
                              }}
                            >
                              SHORT
                            </Button>
                            <Button
                              type="button"
                              variant={strategy.direction === "BOTH" ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: { ...prev[strategyName], direction: "BOTH" },
                                }));
                              }}
                            >
                              BOTH
                            </Button>
                          </div>
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 justify-end">
                            <Label htmlFor={`priority-${strategyName}`}>עדיפות (Priority)</Label>
                            <Dialog>
                              <DialogTrigger asChild={true}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  aria-label={`הסבר על עדיפות ${strategyName}`}
                                >
                                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl text-right">
                                <DialogHeader>
                                  <DialogTitle>עדיפות (Priority)</DialogTitle>
                                  <DialogDescription asChild={true}>
                                    <div className="space-y-4 mt-4 text-foreground">
                                      <p className="leading-relaxed">
                                        <strong>Priority</strong> קובע את סדר העדיפות של האסטרטגיה.
                                        מספר נמוך יותר = עדיפות גבוהה יותר. כאשר מספר אסטרטגיות מזהה
                                        תבניות במקביל, האסטרטגיה עם עדיפות גבוהה יותר תרוץ קודם.
                                      </p>
                                    </div>
                                  </DialogDescription>
                                </DialogHeader>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="flex justify-end">
                            <Input
                              id={`priority-${strategyName}`}
                              type="number"
                              step="1"
                              value={strategy.priority}
                              onChange={(e) => {
                                setStrategyContext((prev) => ({
                                  ...prev,
                                  [strategyName]: {
                                    ...prev[strategyName],
                                    priority: e.target.value,
                                  },
                                }));
                              }}
                              placeholder="1"
                              className="max-w-md"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="filters" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            מסננים והגבלות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקה זו מגדירה את כל המסננים וההגבלות של מערכת
                  הסריקה. זה כולל את הסף המינימלי של Master Score, מספר מקסימלי של מניות לסריקה,
                  דרישה לנרות סגורים בלבד, זמן Debounce למניעת אותות כפולים, וסינון לפי כיוון
                  המאסטר. כל אלו מבטיחים שהמערכת תזהה רק תבניות איכותיות ותמנע אותות מזויפים או
                  כפולים.
                </p>
              </div>

              <div className="space-y-6">
                {/* Min Master Score */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="min-master-score">סף מינימלי של Master Score</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על סף מינימלי"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>סף מינימלי של Master Score</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Min Master Score</strong> הוא הסף המינימלי שמניה חייבת להשיג
                                במערכת הניקוד כדי להיות מועמדת לסריקה. מניות עם ציון נמוך מסף זה
                                יידחו ולא יסרקו לתבניות.
                              </p>
                              <p className="leading-relaxed">
                                <strong>איך זה עובד:</strong> המערכת מקבלת רשימת מניות מהמאסטר
                                סקורינג. רק מניות עם masterScore ≥ minMasterScore ייכללו בסריקה. זה
                                מסייע להפחית עומס ולסרוק רק הזדמנויות איכותיות.
                              </p>
                              <p className="leading-relaxed">
                                <strong>ערך מומלץ:</strong> 6.0 (ברירת מחדל). ערכים גבוהים יותר
                                יגבילו את הסריקה למניות חזקות יותר, ערכים נמוכים יותר יכניסו גם
                                מניות חלשות יותר.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="min-master-score"
                      type="number"
                      step="0.1"
                      value={minMasterScore}
                      onChange={(e) => setMinMasterScore(e.target.value)}
                      placeholder="למשל: 6.0"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Max Symbols To Scan */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="max-symbols-scan">מספר מקסימלי של מניות לסריקה</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על מספר מקסימלי"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>מספר מקסימלי של מניות לסריקה</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Max Symbols To Scan</strong> מגביל את מספר המניות שהמערכת
                                תסרוק במקביל. זה מסייע לשלוט בעומס המערכת ולמנוע יותר מדי מנויים
                                לנתונים בזמן אמת.
                              </p>
                              <p className="leading-relaxed">
                                <strong>איך זה עובד:</strong> גם אם יש יותר מניות שעברו את הסף
                                המינימלי, המערכת תסרוק רק את ה-N הראשונות (המדורגות הגבוה ביותר).
                              </p>
                              <p className="leading-relaxed">
                                <strong>ערך מומלץ:</strong> 20 (ברירת מחדל). ניתן להתאים לפי כוח
                                החישוב ורוחב הפס הזמינים.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="max-symbols-scan"
                      type="number"
                      value={maxSymbolsToScan}
                      onChange={(e) => setMaxSymbolsToScan(e.target.value)}
                      placeholder="למשל: 20"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Require Closed Candle */}
                <div className="space-y-2">
                  <Label>האם לדרוש נרות סגורים בלבד?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={requireClosedCandle === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setRequireClosedCandle(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={requireClosedCandle === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setRequireClosedCandle(false)}
                    >
                      לא
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    אם מופעל, המערכת תזהה תבניות רק על נרות שכבר נסגרו. זה מונע אותות מזויפים מנרות
                    שעדיין פתוחים.
                  </p>
                </div>

                {/* Debounce Ms */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="debounce-ms">זמן Debounce (מילישניות)</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על Debounce"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>זמן Debounce (מילישניות)</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Debounce</strong> הוא מנגנון אנטי-ספאם שמונע מהמערכת לשלוח
                                מספר אותות באותו תבנית באותו זמן קצר.
                              </p>
                              <p className="leading-relaxed">
                                <strong>איך זה עובד:</strong> אם זוהתה תבנית, המערכת תחכה X
                                מילישניות לפני שתאפשר אות נוסף מאותה תבנית על אותה מניה. זה מונע
                                הצפת אותות.
                              </p>
                              <p className="leading-relaxed">
                                <strong>ערך מומלץ:</strong> 2000ms (2 שניות). ערכים גבוהים יותר
                                ימנעו יותר אותות כפולים, אך עלולים להחמיץ הזדמנויות מהירות.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="debounce-ms"
                      type="number"
                      value={debounceMs}
                      onChange={(e) => setDebounceMs(e.target.value)}
                      placeholder="למשל: 2000"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Enable Direction Filter */}
                <div className="space-y-2">
                  <Label>האם לסנן לפי כיוון המאסטר?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={enableDirectionFilter === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setEnableDirectionFilter(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={enableDirectionFilter === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setEnableDirectionFilter(false)}
                    >
                      לא
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    אם מופעל, רק אסטרטגיות שמתאימות לכיוון שהמאסטר קבע יורצו. למשל, מניה עם
                    direction=LONG תפעיל רק אסטרטגיות LONG או BOTH.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="backtest" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            הגדרות Backtest
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> הגדרות Backtest מאפשרות לבדוק את ביצועי מערכת
                  הסריקה על נתונים היסטוריים. זה מאפשר לבדוק כמה תבניות היו מזוהות, באיזה תדירות,
                  ואיך זה היה מתורגם לאותות מסחר. ניתן לבחור כלול שעות טרום-שוק ואחרי-שוק, להתעלם
                  מסף Master Score, ולבחור תקופת זמן לבדיקה.
                </p>
              </div>

              <div className="space-y-6">
                {/* Backtest Enabled */}
                <div className="space-y-2">
                  <Label>האם להפעיל מצב Backtest?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={backtestEnabled === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestEnabled(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={backtestEnabled === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestEnabled(false)}
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Include Premarket */}
                <div className="space-y-2">
                  <Label>הכללת שעות טרום-שוק</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={backtestIncludePremarket === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIncludePremarket(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={backtestIncludePremarket === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIncludePremarket(false)}
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Include After Hours */}
                <div className="space-y-2">
                  <Label>הכללת שעות אחרי-שוק</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={backtestIncludeAfterHours === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIncludeAfterHours(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={backtestIncludeAfterHours === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIncludeAfterHours(false)}
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Backtest Days */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="backtest-days">מספר ימים לבדיקה</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על מספר ימים"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>מספר ימים לבדיקה</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Days</strong> מגדיר כמה ימי מסחר היסטוריים לכלול בבדיקת
                                Backtest. המערכת תסרוק את כל הנרות מתקופה זו ותזהה תבניות.
                              </p>
                              <p className="leading-relaxed">
                                <strong>ערך מומלץ:</strong> 30 ימים. ערכים גבוהים יותר יספקו יותר
                                נתונים אך ייקחו יותר זמן לעיבוד.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="backtest-days"
                      type="number"
                      value={backtestDays}
                      onChange={(e) => setBacktestDays(e.target.value)}
                      placeholder="למשל: 30"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Ignore Master Score */}
                <div className="space-y-2">
                  <Label>התעלם מסף Master Score ב-Backtest?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={backtestIgnoreMasterScore === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIgnoreMasterScore(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={backtestIgnoreMasterScore === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setBacktestIgnoreMasterScore(false)}
                    >
                      לא
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    אם מופעל, Backtest יסרוק את כל המניות ללא קשר לציון Master Score. זה שימושי
                    לבדיקה אם יש תבניות על מניות שלא עברו את הסף.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}

function ExecutionAccordionContent() {
  const [mounted, setMounted] = useState(false);

  // Execution Engine state
  const [totalAccountValue, setTotalAccountValue] = useState<string>("10000");
  const [maxExposurePct, setMaxExposurePct] = useState<string>("95");
  const [maxConcurrentTrades, setMaxConcurrentTrades] = useState<string>("3");
  const [riskPerTradePct, setRiskPerTradePct] = useState<string>("1");
  const [mode, setMode] = useState<"LIVE" | "DEMO" | "BACKTEST">("DEMO");
  const [latestEntryTime, setLatestEntryTime] = useState<string>("15:30");
  const [forceExitTime, setForceExitTime] = useState<string>("15:45");
  const [relocationThresholdR, setRelocationThresholdR] = useState<string>("2.0");

  // Risk Management state
  const [dailyLossLimit, setDailyLossLimit] = useState<string>("");
  const [maxDrawdownPct, setMaxDrawdownPct] = useState<string>("");
  const [maxPositionSizePerSymbol, setMaxPositionSizePerSymbol] = useState<string>("");

  // Position Management state
  const [takeProfitEnabled, setTakeProfitEnabled] = useState<boolean>(false);
  const [targetMovePct, setTargetMovePct] = useState<string>("");
  const [targetR, setTargetR] = useState<string>("");

  // Circuit Breaker state
  const [circuitBreakerEnabled, setCircuitBreakerEnabled] = useState<boolean>(false);
  const [circuitBreakerFailureThreshold, setCircuitBreakerFailureThreshold] = useState<string>("5");
  const [circuitBreakerCooldownMs, setCircuitBreakerCooldownMs] = useState<string>("60000");

  // IBKR state
  const [ibkrHost, setIbkrHost] = useState<string>("127.0.0.1");
  const [ibkrPort, setIbkrPort] = useState<string>("7497");
  const [ibkrAccountId, setIbkrAccountId] = useState<string>("");
  const [ibkrLive, setIbkrLive] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-right space-y-4">
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="w-full space-y-0">
        <AccordionItem value="execution-config" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            הגדרות ביצוע כללי
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקה זו מגדירה את ההגדרות הכלליות של מנוע הביצוע.
                  היא כוללת את גודל החשבון, אחוז חשיפה מקסימלי, מספר מקסימלי של עסקאות במקביל, אחוז
                  סיכון לעסקה (Risk per Trade), מצב הפעלה (LIVE/DEMO/BACKTEST), זמן כניסה אחרון,
                  וזמן סגירה כפויה בסוף היום. כל אלו מגדירים את ההתנהגות הכללית של מנוע הביצוע
                  ומוודאים שהוא פועל בצורה בטוחה ובקרת סיכונים.
                </p>
              </div>

              <div className="space-y-6">
                {/* Total Account Value */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="total-account-value">גודל החשבון הכולל ($)</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על גודל החשבון"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>גודל החשבון הכולל</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Total Account Value</strong> הוא הערך הכולל של החשבון
                                בדולרים. ערך זה משמש לחישוב גודל הפוזיציות, מגבלות חשיפה, וסיכון לכל
                                עסקה.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="total-account-value"
                      type="number"
                      value={totalAccountValue}
                      onChange={(e) => setTotalAccountValue(e.target.value)}
                      placeholder="למשל: 10000"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Max Exposure Pct */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="max-exposure-pct">אחוז חשיפה מקסימלי</Label>
                    <Dialog>
                      <DialogTrigger asChild={true}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          aria-label="הסבר על אחוז חשיפה"
                        >
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl text-right">
                        <DialogHeader>
                          <DialogTitle>אחוז חשיפה מקסימלי</DialogTitle>
                          <DialogDescription asChild={true}>
                            <div className="space-y-4 mt-4 text-foreground">
                              <p className="leading-relaxed">
                                <strong>Max Exposure Pct</strong> מגדיר כמה אחוז מהחשבון מותר להשקיע
                                במסחר. השאר נשאר כרזרבה. למשל, 95% משמעותו שמותר להשקיע עד 95%
                                מהחשבון.
                              </p>
                            </div>
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="max-exposure-pct"
                      type="number"
                      step="1"
                      value={maxExposurePct}
                      onChange={(e) => setMaxExposurePct(e.target.value)}
                      placeholder="למשל: 95"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Max Concurrent Trades */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="max-concurrent-trades">מספר מקסימלי של עסקאות במקביל</Label>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="max-concurrent-trades"
                      type="number"
                      value={maxConcurrentTrades}
                      onChange={(e) => setMaxConcurrentTrades(e.target.value)}
                      placeholder="למשל: 3"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Risk Per Trade Pct */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="risk-per-trade-pct">אחוז סיכון לכל עסקה</Label>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="risk-per-trade-pct"
                      type="number"
                      step="0.1"
                      value={riskPerTradePct}
                      onChange={(e) => setRiskPerTradePct(e.target.value)}
                      placeholder="למשל: 1"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Mode */}
                <div className="space-y-2">
                  <Label>מצב הפעלה</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={mode === "LIVE" ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setMode("LIVE")}
                    >
                      LIVE
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "DEMO" ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setMode("DEMO")}
                    >
                      DEMO
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "BACKTEST" ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setMode("BACKTEST")}
                    >
                      BACKTEST
                    </Button>
                  </div>
                </div>

                {/* Latest Entry Time */}
                <div className="space-y-2">
                  <Label htmlFor="latest-entry-time">זמן כניסה אחרון (HH:MM)</Label>
                  <div className="flex justify-end">
                    <Input
                      id="latest-entry-time"
                      type="text"
                      value={latestEntryTime}
                      onChange={(e) => setLatestEntryTime(e.target.value)}
                      placeholder="למשל: 15:30"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Force Exit Time */}
                <div className="space-y-2">
                  <Label htmlFor="force-exit-time">זמן סגירה כפויה (HH:MM)</Label>
                  <div className="flex justify-end">
                    <Input
                      id="force-exit-time"
                      type="text"
                      value={forceExitTime}
                      onChange={(e) => setForceExitTime(e.target.value)}
                      placeholder="למשל: 15:45"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Relocation Threshold R */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 justify-end">
                    <Label htmlFor="relocation-threshold-r">סף R לרילוקציה</Label>
                  </div>
                  <div className="flex justify-end">
                    <Input
                      id="relocation-threshold-r"
                      type="number"
                      step="0.1"
                      value={relocationThresholdR}
                      onChange={(e) => setRelocationThresholdR(e.target.value)}
                      placeholder="למשל: 2.0"
                      className="max-w-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="risk-management" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            ניהול סיכונים
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת ניהול הסיכונים מגנה על החשבון מפני הפסדים
                  גדולים באמצעות מספר מנגנונים. היא כוללת מגבלת הפסד יומית, מגבלת Drawdown מקסימלי,
                  מגבלת גודל פוזיציה למניה אחת, וחישוב Risk per Trade. המערכת עוקבת אחרי הביצועים
                  היומיים, שיא החשבון, והחשיפה הנוכחית, ומונעת פתיחת עסקאות חדשות אם מושגים הספים.
                  זהו מנגנון בטיחות קריטי להגנה על ההון.
                </p>
              </div>

              <div className="space-y-6">
                {/* Daily Loss Limit */}
                <div className="space-y-2">
                  <Label htmlFor="daily-loss-limit">מגבלת הפסד יומית ($) - אופציונלי</Label>
                  <div className="flex justify-end">
                    <Input
                      id="daily-loss-limit"
                      type="number"
                      value={dailyLossLimit}
                      onChange={(e) => setDailyLossLimit(e.target.value)}
                      placeholder="למשל: 500"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Max Drawdown Pct */}
                <div className="space-y-2">
                  <Label htmlFor="max-drawdown-pct">מגבלת Drawdown מקסימלי (%) - אופציונלי</Label>
                  <div className="flex justify-end">
                    <Input
                      id="max-drawdown-pct"
                      type="number"
                      step="0.1"
                      value={maxDrawdownPct}
                      onChange={(e) => setMaxDrawdownPct(e.target.value)}
                      placeholder="למשל: 10"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* Max Position Size Per Symbol */}
                <div className="space-y-2">
                  <Label htmlFor="max-position-size">
                    מגבלת גודל פוזיציה למניה ($) - אופציונלי
                  </Label>
                  <div className="flex justify-end">
                    <Input
                      id="max-position-size"
                      type="number"
                      value={maxPositionSizePerSymbol}
                      onChange={(e) => setMaxPositionSizePerSymbol(e.target.value)}
                      placeholder="למשל: 5000"
                      className="max-w-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="position-management" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            ניהול פוזיציות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקה זו מטפלת בכל ההיבטים של ניהול פוזיציות
                  פתוחות. היא כוללת ניהול Stop Loss (כולל Trailing Stop), רילוקציה של פוזיציות
                  (החלפת עסקה קיימת בעסקה חדשה אם הפוזיציה הקיימת מרוויחה מעל סף מסוים), וסגירה
                  כפויה של כל הפוזיציות בסוף היום. המערכת עוקבת אחרי כל פוזיציה פתוחה, מעדכנת את
                  מחירי ה-Stop Loss, ומנהלת את היציאות לפי לוגיקת האסטרטגיה ותנאי השוק.
                </p>
              </div>

              <div className="space-y-6">
                {/* Take Profit Enabled */}
                <div className="space-y-2">
                  <Label>האם להפעיל Take Profit?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={takeProfitEnabled === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setTakeProfitEnabled(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={takeProfitEnabled === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setTakeProfitEnabled(false)}
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Target Move Pct */}
                {takeProfitEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="target-move-pct">יעד תנועה באחוזים (3%-5%) - אופציונלי</Label>
                    <div className="flex justify-end">
                      <Input
                        id="target-move-pct"
                        type="number"
                        step="0.1"
                        value={targetMovePct}
                        onChange={(e) => setTargetMovePct(e.target.value)}
                        placeholder="למשל: 3"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}

                {/* Target R */}
                {takeProfitEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="target-r">יעד R (2R-3R) - אופציונלי</Label>
                    <div className="flex justify-end">
                      <Input
                        id="target-r"
                        type="number"
                        step="0.1"
                        value={targetR}
                        onChange={(e) => setTargetR(e.target.value)}
                        placeholder="למשל: 2"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="circuit-breaker" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            מפסק אוטומטי (Circuit Breaker)
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מפסק אוטומטי הוא מנגנון בטיחות נוסף שמגן על המערכת
                  מפני תקלות חוזרות ונשנות. אם המערכת חווה מספר כשלונות רצופים בביצוע פקודות (למשל,
                  בעיות חיבור ל-IBKR או דחיית פקודות), המפסק נפתח ומונע מהמערכת לנסות לבצע עסקאות
                  נוספות למשך תקופת זמן מוגדרת. לאחר תקופת הקירור, המערכת חוזרת לפעול אוטומטית. זה
                  מונע מהמערכת להמשיך ולהפסיד כסף במצבים של בעיות טכניות.
                </p>
              </div>

              <div className="space-y-6">
                {/* Circuit Breaker Enabled */}
                <div className="space-y-2">
                  <Label>האם להפעיל מפסק אוטומטי?</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={circuitBreakerEnabled === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setCircuitBreakerEnabled(true)}
                    >
                      כן
                    </Button>
                    <Button
                      type="button"
                      variant={circuitBreakerEnabled === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setCircuitBreakerEnabled(false)}
                    >
                      לא
                    </Button>
                  </div>
                </div>

                {/* Failure Threshold */}
                {circuitBreakerEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="failure-threshold">מספר כשלונות לפני הפעלה</Label>
                    <div className="flex justify-end">
                      <Input
                        id="failure-threshold"
                        type="number"
                        value={circuitBreakerFailureThreshold}
                        onChange={(e) => setCircuitBreakerFailureThreshold(e.target.value)}
                        placeholder="למשל: 5"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}

                {/* Cooldown Ms */}
                {circuitBreakerEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="cooldown-ms">זמן קירור (מילישניות)</Label>
                    <div className="flex justify-end">
                      <Input
                        id="cooldown-ms"
                        type="number"
                        value={circuitBreakerCooldownMs}
                        onChange={(e) => setCircuitBreakerCooldownMs(e.target.value)}
                        placeholder="למשל: 60000"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="ibkr" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            הגדרות IBKR
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> הגדרות IBKR מגדירות את החיבור ל-Interactive Brokers
                  Trader Workstation (TWS) או Gateway. כאן מגדירים את כתובת ה-IP והפורט של החיבור,
                  מספר החשבון, וסוג החשבון (LIVE או PAPER). זה משמש רק במצב LIVE לביצוע פקודות
                  אמיתיות.
                </p>
              </div>

              <div className="space-y-6">
                {/* IBKR Host */}
                <div className="space-y-2">
                  <Label htmlFor="ibkr-host">כתובת IP / Host</Label>
                  <div className="flex justify-end">
                    <Input
                      id="ibkr-host"
                      type="text"
                      value={ibkrHost}
                      onChange={(e) => setIbkrHost(e.target.value)}
                      placeholder="למשל: 127.0.0.1"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* IBKR Port */}
                <div className="space-y-2">
                  <Label htmlFor="ibkr-port">פורט</Label>
                  <div className="flex justify-end">
                    <Input
                      id="ibkr-port"
                      type="number"
                      value={ibkrPort}
                      onChange={(e) => setIbkrPort(e.target.value)}
                      placeholder="למשל: 7497"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* IBKR Account ID */}
                <div className="space-y-2">
                  <Label htmlFor="ibkr-account-id">מספר חשבון</Label>
                  <div className="flex justify-end">
                    <Input
                      id="ibkr-account-id"
                      type="text"
                      value={ibkrAccountId}
                      onChange={(e) => setIbkrAccountId(e.target.value)}
                      placeholder="מספר חשבון IBKR"
                      className="max-w-md"
                    />
                  </div>
                </div>

                {/* IBKR Live */}
                <div className="space-y-2">
                  <Label>סוג חשבון</Label>
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant={ibkrLive === true ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setIbkrLive(true)}
                    >
                      LIVE
                    </Button>
                    <Button
                      type="button"
                      variant={ibkrLive === false ? "default" : "outline"}
                      className="max-w-md"
                      onClick={() => setIbkrLive(false)}
                    >
                      PAPER
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}

function ScoringAccordionContent() {
  const [mounted, setMounted] = useState(false);

  // NEWS_SCORING_SYSTEM state
  const [marketMacroWeight, setMarketMacroWeight] = useState<string>("1.0");
  const [sectorMacroWeight, setSectorMacroWeight] = useState<string>("1.0");
  const [microGlobalWeight, setMicroGlobalWeight] = useState<string>("1.0");
  const [microCompanyWeight, setMicroCompanyWeight] = useState<string>("1.0");
  const [sectorSensitivityMultiplier, setSectorSensitivityMultiplier] = useState<string>("1.0");
  const [macroNewsLifetimeMinutes, setMacroNewsLifetimeMinutes] = useState<string>("1440");
  const [sectorNewsLifetimeMinutes, setSectorNewsLifetimeMinutes] = useState<string>("720");
  const [companyNewsLifetimeMinutes, setCompanyNewsLifetimeMinutes] = useState<string>("360");
  const [minNewsScoreToAffect, setMinNewsScoreToAffect] = useState<string>("0.5");
  const [includeEarnings, setIncludeEarnings] = useState<boolean>(true);
  const [includeDilution, setIncludeDilution] = useState<boolean>(true);
  const [includeRegulatory, setIncludeRegulatory] = useState<boolean>(true);
  const [enabledNewsSources, setEnabledNewsSources] = useState<string[]>(["IBKR", "Yahoo"]);
  const [maxNewsItemsPerSymbol, setMaxNewsItemsPerSymbol] = useState<string>("50");

  // TECHNICAL_INDICATORS state
  const [enableRSI, setEnableRSI] = useState<boolean>(true);
  const [enableMACD, setEnableMACD] = useState<boolean>(true);
  const [enableSMA, setEnableSMA] = useState<boolean>(true);
  const [enableVWAP, setEnableVWAP] = useState<boolean>(true);
  const [enableVolume, setEnableVolume] = useState<boolean>(true);
  const [enableATR, setEnableATR] = useState<boolean>(true);
  const [enableBollinger, setEnableBollinger] = useState<boolean>(true);
  const [rsiOverboughtLevel, setRsiOverboughtLevel] = useState<string>("70");
  const [rsiOversoldLevel, setRsiOversoldLevel] = useState<string>("30");
  const [rsiExtremeHigh, setRsiExtremeHigh] = useState<string>("80");
  const [rsiExtremeLow, setRsiExtremeLow] = useState<string>("20");
  const [macdFastLength, setMacdFastLength] = useState<string>("12");
  const [macdSlowLength, setMacdSlowLength] = useState<string>("26");
  const [macdSignalLength, setMacdSignalLength] = useState<string>("9");
  const [atrStopMultiplier, setAtrStopMultiplier] = useState<string>("2.0");
  const [smaPeriods, setSmaPeriods] = useState<string>("9,20,50,150,200");
  const [maxVwapDistanceATR, setMaxVwapDistanceATR] = useState<string>("2.0");
  const [minorTimeframe, setMinorTimeframe] = useState<string>("5m");
  const [majorTimeframe, setMajorTimeframe] = useState<string>("daily");

  // PRICE_ACTION_PATTERNS state
  const [enableDoubleTop, setEnableDoubleTop] = useState<boolean>(true);
  const [enableDoubleBottom, setEnableDoubleBottom] = useState<boolean>(true);
  const [enableBreakout, setEnableBreakout] = useState<boolean>(true);
  const [enableBreakdown, setEnableBreakdown] = useState<boolean>(true);
  const [enableGaps, setEnableGaps] = useState<boolean>(true);
  const [enableCandles, setEnableCandles] = useState<boolean>(true);
  const [enableTrendStructure, setEnableTrendStructure] = useState<boolean>(true);
  const [minPercentageDropBetweenTops, setMinPercentageDropBetweenTops] = useState<string>("3");
  const [minCandleDistanceBetweenTops, setMinCandleDistanceBetweenTops] = useState<string>("10");
  const [maxDifferenceBetweenTopsPercent, setMaxDifferenceBetweenTopsPercent] =
    useState<string>("2");
  const [volumeRequirementOnReversal, setVolumeRequirementOnReversal] = useState<string>("1.5");
  const [necklineBreakConfirmation, setNecklineBreakConfirmation] = useState<boolean>(true);
  const [minPatternStrength, setMinPatternStrength] = useState<string>("5");

  // OPTIONS_FLOW state
  const [enableUOA, setEnableUOA] = useState<boolean>(true);
  const [enablePutCallImbalance, setEnablePutCallImbalance] = useState<boolean>(true);
  const [enableIVChanges, setEnableIVChanges] = useState<boolean>(true);
  const [enableGammaExposure, setEnableGammaExposure] = useState<boolean>(true);
  const [enableOpenInterestChanges, setEnableOpenInterestChanges] = useState<boolean>(true);
  const [enableSkew, setEnableSkew] = useState<boolean>(true);
  const [putCallRatioLow, setPutCallRatioLow] = useState<string>("0.7");
  const [putCallRatioHigh, setPutCallRatioHigh] = useState<string>("1.3");
  const [unusualVolumeMultiplier, setUnusualVolumeMultiplier] = useState<string>("2.0");
  const [ivSpikePercent, setIvSpikePercent] = useState<string>("10");
  const [ivCrushPercent, setIvCrushPercent] = useState<string>("-5");
  const [gammaFlipThreshold, setGammaFlipThreshold] = useState<string>("0");
  const [optionsFlowWeight, setOptionsFlowWeight] = useState<string>("1.05");

  // SENTIMENT state
  const [includeTwitter, setIncludeTwitter] = useState<boolean>(true);
  const [includeReddit, setIncludeReddit] = useState<boolean>(true);
  const [includeNewsSentiment, setIncludeNewsSentiment] = useState<boolean>(true);
  const [includeStockSentiment, setIncludeStockSentiment] = useState<boolean>(true);
  const [includeMarketSentiment, setIncludeMarketSentiment] = useState<boolean>(true);
  const [minMentionsVolume, setMinMentionsVolume] = useState<string>("10");
  const [trendingMultiplier, setTrendingMultiplier] = useState<string>("2.0");
  const [sentimentWeight, setSentimentWeight] = useState<string>("0.80");

  // FUNDAMENTALS state
  const [maxPE, setMaxPE] = useState<string>("30");
  const [maxPS, setMaxPS] = useState<string>("10");
  const [maxPB, setMaxPB] = useState<string>("5");
  const [minEPSGrowth5Y, setMinEPSGrowth5Y] = useState<string>("5");
  const [minRevenueGrowthYoY, setMinRevenueGrowthYoY] = useState<string>("10");
  const [minProfitMargin, setMinProfitMargin] = useState<string>("10");
  const [minROE, setMinROE] = useState<string>("15");
  const [maxDebtToEquity, setMaxDebtToEquity] = useState<string>("100");
  const [minFreeCashflowMargin, setMinFreeCashflowMargin] = useState<string>("5");
  const [valuationWeight, setValuationWeight] = useState<string>("1.0");
  const [growthWeight, setGrowthWeight] = useState<string>("1.0");
  const [profitabilityWeight, setProfitabilityWeight] = useState<string>("1.0");
  const [leverageWeight, setLeverageWeight] = useState<string>("1.0");
  const [cashflowWeight, setCashflowWeight] = useState<string>("1.0");

  // POSITION_RISK state
  const [maxCapitalUsagePercent, setMaxCapitalUsagePercent] = useState<string>("95");
  const [maxRiskPerTradePercent, setMaxRiskPerTradePercent] = useState<string>("1");
  const [maxDailyDrawdownPercent, setMaxDailyDrawdownPercent] = useState<string>("5");
  const [maxSymbolExposurePercent, setMaxSymbolExposurePercent] = useState<string>("20");
  const [maxSectorExposurePercent, setMaxSectorExposurePercent] = useState<string>("30");
  const [maxOpenPositions, setMaxOpenPositions] = useState<string>("5");
  const [minRiskRewardRatio, setMinRiskRewardRatio] = useState<string>("2.0");
  const [positionRiskWeight, setPositionRiskWeight] = useState<string>("0.70");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-right space-y-4">
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
        <div className="h-12 border-b border-border animate-pulse bg-muted rounded" />
      </div>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="w-full space-y-0">
        <AccordionItem value="indicators" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            אינדיקטורים
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת האינדיקטורים הטכניים מנתחת את התנהגות המחיר
                  באמצעות אינדיקטורים מתקדמים כגון RSI, MACD, ממוצעים נעים, VWAP, נפח, ATR
                  ו-Bollinger Bands. המחלקה מזהה תנאי שוק שונים (מומנטום, מגמה, תנודתיות) ומתרגמת
                  אותם לציון בטווח -10 עד +10. המחלקה מאורגנת בקבוצות לפי סוג האינדיקטור (Momentum,
                  Trend, Volume, Volatility, Price Action) כאשר כל קבוצה מקבלת משקל בסיסי משלה.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>משקל במאסטר סקורינג:</strong> 1.0 (משקל שווה ערך)
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold">אינדיקטורים פעילים</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "RSI", state: enableRSI, setter: setEnableRSI },
                    { key: "MACD", state: enableMACD, setter: setEnableMACD },
                    { key: "SMA", state: enableSMA, setter: setEnableSMA },
                    { key: "VWAP", state: enableVWAP, setter: setEnableVWAP },
                    { key: "Volume", state: enableVolume, setter: setEnableVolume },
                    { key: "ATR", state: enableATR, setter: setEnableATR },
                    { key: "Bollinger", state: enableBollinger, setter: setEnableBollinger },
                  ].map((indicator) => (
                    <div key={indicator.key} className="space-y-2">
                      <Label>{indicator.key}</Label>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={indicator.state === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => indicator.setter(true)}
                        >
                          פעיל
                        </Button>
                        <Button
                          type="button"
                          variant={indicator.state === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => indicator.setter(false)}
                        >
                          לא פעיל
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RSI Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">הגדרות RSI</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rsi-overbought">רמת Overbought</Label>
                      <Input
                        id="rsi-overbought"
                        type="number"
                        value={rsiOverboughtLevel}
                        onChange={(e) => setRsiOverboughtLevel(e.target.value)}
                        placeholder="70"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rsi-oversold">רמת Oversold</Label>
                      <Input
                        id="rsi-oversold"
                        type="number"
                        value={rsiOversoldLevel}
                        onChange={(e) => setRsiOversoldLevel(e.target.value)}
                        placeholder="30"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rsi-extreme-high">רמת Extreme High</Label>
                      <Input
                        id="rsi-extreme-high"
                        type="number"
                        value={rsiExtremeHigh}
                        onChange={(e) => setRsiExtremeHigh(e.target.value)}
                        placeholder="80"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rsi-extreme-low">רמת Extreme Low</Label>
                      <Input
                        id="rsi-extreme-low"
                        type="number"
                        value={rsiExtremeLow}
                        onChange={(e) => setRsiExtremeLow(e.target.value)}
                        placeholder="20"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* MACD Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">הגדרות MACD</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="macd-fast">Fast Length</Label>
                      <Input
                        id="macd-fast"
                        type="number"
                        value={macdFastLength}
                        onChange={(e) => setMacdFastLength(e.target.value)}
                        placeholder="12"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="macd-slow">Slow Length</Label>
                      <Input
                        id="macd-slow"
                        type="number"
                        value={macdSlowLength}
                        onChange={(e) => setMacdSlowLength(e.target.value)}
                        placeholder="26"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="macd-signal">Signal Length</Label>
                      <Input
                        id="macd-signal"
                        type="number"
                        value={macdSignalLength}
                        onChange={(e) => setMacdSignalLength(e.target.value)}
                        placeholder="9"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* ATR Settings */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">הגדרות ATR</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="atr-stop-mult">ATR Stop Multiplier</Label>
                      <Input
                        id="atr-stop-mult"
                        type="number"
                        step="0.1"
                        value={atrStopMultiplier}
                        onChange={(e) => setAtrStopMultiplier(e.target.value)}
                        placeholder="2.0"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Timeframes */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Timeframes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minor-timeframe">Minor Timeframe</Label>
                      <Input
                        id="minor-timeframe"
                        type="text"
                        value={minorTimeframe}
                        onChange={(e) => setMinorTimeframe(e.target.value)}
                        placeholder="5m"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="major-timeframe">Major Timeframe</Label>
                      <Input
                        id="major-timeframe"
                        type="text"
                        value={majorTimeframe}
                        onChange={(e) => setMajorTimeframe(e.target.value)}
                        placeholder="daily"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="options-flow" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            ניקוד זרימת אופציות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת זרימת אופציות מנתחת את הפעילות בשוק האופציות
                  כדי לזהות תנועות משמעותיות וזרימות כסף חכמות. המחלקה בוחנת חוסר איזון בין Call
                  ו-Put, פעילות חריגה (UOA), שינויים ב-Open Interest, תנודות ב-Implied Volatility,
                  Skew בין Put ל-Call, ו-Gamma Exposure של דילרים. כל אלה מתורגמים לאותות שוריים או
                  דוביים בעוצמה משתנה. המחלקה פועלת ברזולוציה תוך-יומית (MINOR) ומתמחה בזיהוי תנועות
                  מהירות בשוק.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>משקל במאסטר סקורינג:</strong> 1.05
                </p>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold">אותות פעילים</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "UOA", state: enableUOA, setter: setEnableUOA },
                    {
                      key: "Put/Call Imbalance",
                      state: enablePutCallImbalance,
                      setter: setEnablePutCallImbalance,
                    },
                    { key: "IV Changes", state: enableIVChanges, setter: setEnableIVChanges },
                    {
                      key: "Gamma Exposure",
                      state: enableGammaExposure,
                      setter: setEnableGammaExposure,
                    },
                    {
                      key: "Open Interest",
                      state: enableOpenInterestChanges,
                      setter: setEnableOpenInterestChanges,
                    },
                    { key: "Skew", state: enableSkew, setter: setEnableSkew },
                  ].map((signal) => (
                    <div key={signal.key} className="space-y-2">
                      <Label>{signal.key}</Label>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={signal.state === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => signal.setter(true)}
                        >
                          פעיל
                        </Button>
                        <Button
                          type="button"
                          variant={signal.state === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => signal.setter(false)}
                        >
                          לא פעיל
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">ספים</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="put-call-low">Put/Call Ratio Low</Label>
                      <Input
                        id="put-call-low"
                        type="number"
                        step="0.1"
                        value={putCallRatioLow}
                        onChange={(e) => setPutCallRatioLow(e.target.value)}
                        placeholder="0.7"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="put-call-high">Put/Call Ratio High</Label>
                      <Input
                        id="put-call-high"
                        type="number"
                        step="0.1"
                        value={putCallRatioHigh}
                        onChange={(e) => setPutCallRatioHigh(e.target.value)}
                        placeholder="1.3"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uoa-mult">Unusual Volume Multiplier</Label>
                      <Input
                        id="uoa-mult"
                        type="number"
                        step="0.1"
                        value={unusualVolumeMultiplier}
                        onChange={(e) => setUnusualVolumeMultiplier(e.target.value)}
                        placeholder="2.0"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iv-spike">IV Spike Percent</Label>
                      <Input
                        id="iv-spike"
                        type="number"
                        value={ivSpikePercent}
                        onChange={(e) => setIvSpikePercent(e.target.value)}
                        placeholder="10"
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="options-weight">Options Flow Weight</Label>
                      <Input
                        id="options-weight"
                        type="number"
                        step="0.01"
                        value={optionsFlowWeight}
                        onChange={(e) => setOptionsFlowWeight(e.target.value)}
                        placeholder="1.05"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="news" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            חדשות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת Sentiment (חדשות ורגש שוק) מנתחת את הרגש
                  הציבורי סביב מניה באמצעות חדשות, רשתות חברתיות (Twitter, Reddit), וסיקורים
                  בתקשורת. המחלקה מזהה רגשות קיצוניים (שוריים או דוביים), פעילות גבוהה, סתירות בין
                  מקורות שונים, ומגמות רב-יומיות. הניתוח מתבצע בשני timeframe-ים: תוך-יומי (MINOR)
                  לזיהוי תנועות מהירות, ויומי/רב-יומי (MAJOR) לזיהוי מגמות ארוכות טווח. המחלקה גם
                  מזהה סביבות Risk-On ו-Risk-Off ברמת השוק הכללי.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>משקל במאסטר סקורינג:</strong> 0.80
                </p>
              </div>

              <div className="space-y-6">
                {/* WEIGHTS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">משקלים</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="market-macro-weight">Market Macro Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Market Macro Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Market Macro Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Market Macro Weight</strong> מגדיר את המשקל שמוקצה
                                    לחדשות מאקרו ברמת השוק כולו (כגון החלטות FED, דוחות אינפלציה,
                                    דוחות תעסוקה). משקל גבוה יותר משמעותו שחדשות מאקרו ישפיעו יותר
                                    על הציון הסופי של המניה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="market-macro-weight"
                          type="number"
                          step="0.1"
                          value={marketMacroWeight}
                          onChange={(e) => setMarketMacroWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="sector-macro-weight">Sector Macro Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Sector Macro Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Sector Macro Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Sector Macro Weight</strong> מגדיר את המשקל שמוקצה
                                    לחדשות מאקרו ברמת הסקטור (כגון חדשות על סקטור הטכנולוגיה,
                                    אנרגיה, פיננסים). זה מסייע לזהות הזדמנויות ברמת סקטור לפני בחירת
                                    מניה ספציפית.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="sector-macro-weight"
                          type="number"
                          step="0.1"
                          value={sectorMacroWeight}
                          onChange={(e) => setSectorMacroWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="micro-global-weight">Micro Global Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Micro Global Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Micro Global Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Micro Global Weight</strong> מגדיר את המשקל לחדשות ברמת
                                    החברה שלא תלויות סקטור (כגון שינוי דירוג אנליסט, הוספה/הסרה
                                    מאינדקס, פעילות פנימיים). אלה חדשות חשובות שמשפיעות על המניה
                                    עצמה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="micro-global-weight"
                          type="number"
                          step="0.1"
                          value={microGlobalWeight}
                          onChange={(e) => setMicroGlobalWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="micro-company-weight">Micro Company Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Micro Company Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Micro Company Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Micro Company Weight</strong> מגדיר את המשקל לחדשות
                                    ספציפיות לחברה (כגון דוחות רווח, הנחיות, דילול, רכישות עצמיות,
                                    שינויי הנהלה). אלה החדשות הכי רלוונטיות למניה הספציפית.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="micro-company-weight"
                          type="number"
                          step="0.1"
                          value={microCompanyWeight}
                          onChange={(e) => setMicroCompanyWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TIME WINDOWS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">חלונות זמן</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="macro-news-lifetime">חדשות מאקרו (דקות)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על זמן חיים"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>זמן חיים של חדשות מאקרו</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>News Lifetime Minutes</strong> מגדיר כמה זמן (בדקות)
                                    חדשות נשארות רלוונטיות ומושפעות על הציון. חדשות מאקרו נשארות
                                    רלוונטיות יותר זמן (למשל 24 שעות = 1440 דקות).
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="macro-news-lifetime"
                          type="number"
                          value={macroNewsLifetimeMinutes}
                          onChange={(e) => setMacroNewsLifetimeMinutes(e.target.value)}
                          placeholder="1440"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="sector-news-lifetime">חדשות סקטור (דקות)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על זמן חיים"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>זמן חיים של חדשות סקטור</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Sector News Lifetime</strong> מגדיר כמה זמן חדשות ברמת
                                    סקטור נשארות רלוונטיות. בדרך כלל זמן בינוני (למשל 12 שעות = 720
                                    דקות).
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="sector-news-lifetime"
                          type="number"
                          value={sectorNewsLifetimeMinutes}
                          onChange={(e) => setSectorNewsLifetimeMinutes(e.target.value)}
                          placeholder="720"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="company-news-lifetime">חדשות חברה (דקות)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על זמן חיים"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>זמן חיים של חדשות חברה</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Company News Lifetime</strong> מגדיר כמה זמן חדשות
                                    ספציפיות לחברה נשארות רלוונטיות. בדרך כלל זמן קצר יותר (למשל 6
                                    שעות = 360 דקות) כי חדשות ספציפיות מתעדכנות יותר מהר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="company-news-lifetime"
                          type="number"
                          value={companyNewsLifetimeMinutes}
                          onChange={(e) => setCompanyNewsLifetimeMinutes(e.target.value)}
                          placeholder="360"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* FILTERS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">מסננים</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-news-score">ציון מינימלי לחדשות</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על ציון מינימלי"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>ציון מינימלי לחדשות</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min News Score To Affect</strong> מגדיר את הציון
                                    המינימלי שחדשה חייבת להשיג כדי להשפיע על הציון הסופי. חדשות עם
                                    ציון נמוך יותר יועלמו ולא ישפיעו על החישוב.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-news-score"
                          type="number"
                          step="0.1"
                          value={minNewsScoreToAffect}
                          onChange={(e) => setMinNewsScoreToAffect(e.target.value)}
                          placeholder="0.5"
                          className="max-w-md"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label>הכללת דוחות רווח</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על דוחות רווח"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>הכללת דוחות רווח</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Include Earnings</strong> קובע האם לכלול דוחות רווח
                                    בניתוח החדשות. דוחות רווח הם חדשות מרכזיות שמשפיעות באופן
                                    משמעותי על המחיר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={includeEarnings === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeEarnings(true)}
                        >
                          כן
                        </Button>
                        <Button
                          type="button"
                          variant={includeEarnings === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeEarnings(false)}
                        >
                          לא
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label>הכללת דילול</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על דילול"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>הכללת דילול</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Include Dilution</strong> קובע האם לכלול חדשות על דילול
                                    מניות (הנפקה חדשה, המרת מניות וכו') בניתוח החדשות. דילול יכול
                                    להשפיע לרעה על מחיר המניה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={includeDilution === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeDilution(true)}
                        >
                          כן
                        </Button>
                        <Button
                          type="button"
                          variant={includeDilution === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeDilution(false)}
                        >
                          לא
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label>הכללת רגולציה</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על רגולציה"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>הכללת רגולציה</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Include Regulatory</strong> קובע האם לכלול חדשות
                                    רגולטוריות (חקיקה, תקנות, תביעות, בדיקות רגולטוריות) בניתוח
                                    החדשות. חדשות רגולטוריות יכולות להשפיע משמעותית על המחיר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={includeRegulatory === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeRegulatory(true)}
                        >
                          כן
                        </Button>
                        <Button
                          type="button"
                          variant={includeRegulatory === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setIncludeRegulatory(false)}
                        >
                          לא
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NEWS_SOURCES */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">מקורות חדשות</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>מקורות פעילים</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {["IBKR", "Yahoo", "AlphaVantage", "Twitter"].map((source) => (
                          <div key={source} className="space-y-2">
                            <Label>{source}</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={
                                  enabledNewsSources.includes(source) ? "default" : "outline"
                                }
                                className="max-w-md"
                                onClick={() => {
                                  if (enabledNewsSources.includes(source)) {
                                    setEnabledNewsSources(
                                      enabledNewsSources.filter((s) => s !== source)
                                    );
                                  } else {
                                    setEnabledNewsSources([...enabledNewsSources, source]);
                                  }
                                }}
                              >
                                {enabledNewsSources.includes(source) ? "פעיל" : "לא פעיל"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-news-items">מספר מקסימלי של חדשות למניה</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max News Items"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>מספר מקסימלי של חדשות למניה</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max News Items Per Symbol</strong> מגביל את מספר הפריטים
                                    המקסימלי של חדשות שמוחזקים לכל מניה. זה מונע עומס יתר ומוודא רק
                                    החדשות החשובות ביותר נשמרות.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-news-items"
                          type="number"
                          value={maxNewsItemsPerSymbol}
                          onChange={(e) => setMaxNewsItemsPerSymbol(e.target.value)}
                          placeholder="50"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SENTIMENT SOURCES */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">מקורות Sentiment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "Twitter", state: includeTwitter, setter: setIncludeTwitter },
                      { key: "Reddit", state: includeReddit, setter: setIncludeReddit },
                      {
                        key: "News Sentiment",
                        state: includeNewsSentiment,
                        setter: setIncludeNewsSentiment,
                      },
                      {
                        key: "Stock Sentiment",
                        state: includeStockSentiment,
                        setter: setIncludeStockSentiment,
                      },
                      {
                        key: "Market Sentiment",
                        state: includeMarketSentiment,
                        setter: setIncludeMarketSentiment,
                      },
                    ].map((source) => (
                      <div key={source.key} className="space-y-2">
                        <Label>{source.key}</Label>
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant={source.state === true ? "default" : "outline"}
                            className="max-w-md"
                            onClick={() => source.setter(true)}
                          >
                            פעיל
                          </Button>
                          <Button
                            type="button"
                            variant={source.state === false ? "default" : "outline"}
                            className="max-w-md"
                            onClick={() => source.setter(false)}
                          >
                            לא פעיל
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SENTIMENT THRESHOLDS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">ספי Sentiment</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-mentions">נפח אזכורים מינימלי</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על נפח אזכורים"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>נפח אזכורים מינימלי</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Mentions Volume</strong> מגדיר כמה אזכורים מינימליים
                                    נדרשים כדי שהרגש יהיה משמעותי. פחות מזה לא ישפיע על הציון.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-mentions"
                          type="number"
                          value={minMentionsVolume}
                          onChange={(e) => setMinMentionsVolume(e.target.value)}
                          placeholder="10"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="trending-mult">Trending Multiplier</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Trending Multiplier"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Trending Multiplier</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Trending Multiplier</strong> מגדיר את המכפיל שמוחל על
                                    חדשות/נושאים טרנדיים. נושאים טרנדיים מקבלים משקל גבוה יותר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="trending-mult"
                          type="number"
                          step="0.1"
                          value={trendingMultiplier}
                          onChange={(e) => setTrendingMultiplier(e.target.value)}
                          placeholder="2.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="sentiment-weight">Sentiment Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Sentiment Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>משקל Sentiment במאסטר סקורינג</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Sentiment Weight</strong> מגדיר את המשקל של מחלקת
                                    Sentiment במאסטר סקורינג. ברירת מחדל: 0.80. זה קובע כמה הרגש
                                    הציבורי משפיע על הציון הסופי.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="sentiment-weight"
                          type="number"
                          step="0.01"
                          value={sentimentWeight}
                          onChange={(e) => setSentimentWeight(e.target.value)}
                          placeholder="0.80"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fundamentals" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            ניקוד יסודות
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת היסודות מנתחת את הבריאות הפיננסית והערכת
                  השווי של חברות באמצעות מפתחות פיננסיים מרכזיים. המחלקה בוחנת מדדי הערכת שווי (PE,
                  PS, PB), מדדי צמיחה (גידול ב-EPS ו-Revenue), מדדי רווחיות (שולי רווח, ROE), מדדי
                  מינוף (Debt-to-Equity, כיסוי ריבית), תזרים מזומנים (FCF Yield), ותשואות דיבידנד.
                  כל מדד מתורגם לציון המשקף האם המניה יקרה, זולה, או בעלת שווי הוגן. המחלקה עובדת
                  בעיקר ברזולוציה יומית/רב-יומית (MAJOR) ומספקת תמונה ארוכת טווח על איכות החברה.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>משקל במאסטר סקורינג:</strong> 0.75
                </p>
              </div>

              <div className="space-y-6">
                {/* VALUATION */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">הערכת שווי</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-pe">Max PE Ratio</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max PE"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max PE Ratio</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max PE</strong> מגדיר את יחס המחיר-רווח המקסימלי הנחשב
                                    מקובל. מניות עם PE גבוה יותר נחשבות יקרות יותר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-pe"
                          type="number"
                          value={maxPE}
                          onChange={(e) => setMaxPE(e.target.value)}
                          placeholder="30"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-ps">Max PS Ratio</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max PS"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max PS Ratio</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max PS</strong> מגדיר את יחס המחיר-מכירות המקסימלי.
                                    שימושי לחברות שלא רווחיות עדיין.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-ps"
                          type="number"
                          value={maxPS}
                          onChange={(e) => setMaxPS(e.target.value)}
                          placeholder="10"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-pb">Max PB Ratio</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max PB"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max PB Ratio</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max PB</strong> מגדיר את יחס המחיר-הון המקסימלי. מדד
                                    להערכת שווי יחסית להון העצמי.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-pb"
                          type="number"
                          value={maxPB}
                          onChange={(e) => setMaxPB(e.target.value)}
                          placeholder="5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* GROWTH */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">צמיחה</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-eps-growth">Min EPS Growth 5Y (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על EPS Growth"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min EPS Growth 5Y</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min EPS Growth 5Y</strong> מגדיר את הצמיחה המינימלית
                                    ב-EPS (רווח למניה) על פני 5 שנים. חברות עם צמיחה נמוכה יותר
                                    נחשבות פחות מושכות.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-eps-growth"
                          type="number"
                          value={minEPSGrowth5Y}
                          onChange={(e) => setMinEPSGrowth5Y(e.target.value)}
                          placeholder="5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-revenue-growth">Min Revenue Growth YoY (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Revenue Growth"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Revenue Growth YoY</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Revenue Growth YoY</strong> מגדיר את הצמיחה
                                    המינימלית בהכנסות משנה לשנה. חברות צומחות נחשבות מושכות יותר
                                    למסחר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-revenue-growth"
                          type="number"
                          value={minRevenueGrowthYoY}
                          onChange={(e) => setMinRevenueGrowthYoY(e.target.value)}
                          placeholder="10"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PROFITABILITY */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">רווחיות</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-profit-margin">Min Profit Margin (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Profit Margin"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Profit Margin</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Profit Margin</strong> מגדיר את שולי הרווח
                                    המינימליים הנדרשים. חברות עם שולי רווח נמוכים יותר פחות מושכות.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-profit-margin"
                          type="number"
                          value={minProfitMargin}
                          onChange={(e) => setMinProfitMargin(e.target.value)}
                          placeholder="10"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-roe">Min ROE (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על ROE"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min ROE (Return on Equity)</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min ROE</strong> מגדיר את תשואת ההון העצמי המינימלית.
                                    מדד חשוב ליעילות השימוש בהון.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-roe"
                          type="number"
                          value={minROE}
                          onChange={(e) => setMinROE(e.target.value)}
                          placeholder="15"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* LEVERAGE */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">מינוף</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-end">
                      <Label htmlFor="max-debt-equity">Max Debt to Equity</Label>
                      <Dialog>
                        <DialogTrigger asChild={true}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            aria-label="הסבר על Debt to Equity"
                          >
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl text-right">
                          <DialogHeader>
                            <DialogTitle>Max Debt to Equity</DialogTitle>
                            <DialogDescription asChild={true}>
                              <div className="space-y-4 mt-4 text-foreground">
                                <p className="leading-relaxed">
                                  <strong>Max Debt to Equity</strong> מגדיר את יחס החוב-הון
                                  המקסימלי. חברות עם מינוף גבוה יותר נחשבות מסוכנות יותר.
                                </p>
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex justify-end">
                      <Input
                        id="max-debt-equity"
                        type="number"
                        value={maxDebtToEquity}
                        onChange={(e) => setMaxDebtToEquity(e.target.value)}
                        placeholder="100"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* CASHFLOW */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">תזרים מזומנים</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 justify-end">
                      <Label htmlFor="min-fcf-margin">Min Free Cashflow Margin (%)</Label>
                      <Dialog>
                        <DialogTrigger asChild={true}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            aria-label="הסבר על FCF Margin"
                          >
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl text-right">
                          <DialogHeader>
                            <DialogTitle>Min Free Cashflow Margin</DialogTitle>
                            <DialogDescription asChild={true}>
                              <div className="space-y-4 mt-4 text-foreground">
                                <p className="leading-relaxed">
                                  <strong>Min Free Cashflow Margin</strong> מגדיר את שולי תזרים
                                  המזומנים החופשי המינימליים. תזרים מזומנים חיובי הוא סימן לבריאות
                                  פיננסית טובה.
                                </p>
                              </div>
                            </DialogDescription>
                          </DialogHeader>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="flex justify-end">
                      <Input
                        id="min-fcf-margin"
                        type="number"
                        value={minFreeCashflowMargin}
                        onChange={(e) => setMinFreeCashflowMargin(e.target.value)}
                        placeholder="5"
                        className="max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* WEIGHTS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">משקלים</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="valuation-weight">Valuation Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Valuation Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Valuation Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Valuation Weight</strong> מגדיר את המשקל של קטגוריית
                                    הערכת השווי (PE, PS, PB) בחישוב הציון של מחלקת Fundamentals.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="valuation-weight"
                          type="number"
                          step="0.1"
                          value={valuationWeight}
                          onChange={(e) => setValuationWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="growth-weight">Growth Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Growth Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Growth Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Growth Weight</strong> מגדיר את המשקל של קטגוריית הצמיחה
                                    (EPS Growth, Revenue Growth) בחישוב הציון של מחלקת Fundamentals.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="growth-weight"
                          type="number"
                          step="0.1"
                          value={growthWeight}
                          onChange={(e) => setGrowthWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="profitability-weight">Profitability Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Profitability Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Profitability Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Profitability Weight</strong> מגדיר את המשקל של קטגוריית
                                    הרווחיות (Profit Margin, ROE) בחישוב הציון של מחלקת
                                    Fundamentals.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="profitability-weight"
                          type="number"
                          step="0.1"
                          value={profitabilityWeight}
                          onChange={(e) => setProfitabilityWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="leverage-weight">Leverage Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Leverage Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Leverage Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Leverage Weight</strong> מגדיר את המשקל של קטגוריית
                                    המינוף (Debt-to-Equity) בחישוב הציון של מחלקת Fundamentals.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="leverage-weight"
                          type="number"
                          step="0.1"
                          value={leverageWeight}
                          onChange={(e) => setLeverageWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="cashflow-weight">Cashflow Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Cashflow Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Cashflow Weight</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Cashflow Weight</strong> מגדיר את המשקל של קטגוריית
                                    תזרים המזומנים (FCF Margin) בחישוב הציון של מחלקת Fundamentals.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="cashflow-weight"
                          type="number"
                          step="0.1"
                          value={cashflowWeight}
                          onChange={(e) => setCashflowWeight(e.target.value)}
                          placeholder="1.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="position-risk" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            ניקוד סיכון פוזיציה
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת ניהול סיכון פוזיציה בודקת את רמת הסיכון
                  הנוכחית של הפורטפוליו ברמות שונות: רמת החשבון (Daily Drawdown, שימוש בהון), רמת
                  הפוזיציה (סיכון לכל עסקה, ביצועי פוזיציה נוכחית), ורמת החשיפה (ריכוז במניה אחת,
                  סקטור, או מניות קורלטיביות). המחלקה מזהה מתי הסיכון קרוב לספים המקסימליים, מתי הוא
                  במיטבו, ומתי יש אזהרה. ציון גבוה (חיובי) משמעותו סיכון נמוך וניהול סיכון טוב, בעוד
                  ציון נמוך (שלילי) מצביע על סיכון גבוה הדורש תשומת לב מיידית. המחלקה עוזרת להגן על
                  ההון ולמנוע הפסדים גדולים.
                </p>
                <p className="text-sm text-foreground mt-2">
                  <strong>משקל במאסטר סקורינג:</strong> 0.70
                </p>
              </div>

              <div className="space-y-6">
                {/* ACCOUNT_RISK */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">סיכון חשבון</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-capital-usage">Max Capital Usage (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Capital Usage"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Capital Usage Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Capital Usage Percent</strong> מגדיר את אחוז ההון
                                    המקסימלי שמותר להשתמש בו למסחר. השאר נשאר כרזרבה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-capital-usage"
                          type="number"
                          value={maxCapitalUsagePercent}
                          onChange={(e) => setMaxCapitalUsagePercent(e.target.value)}
                          placeholder="95"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-risk-per-trade-pct">Max Risk Per Trade (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Risk Per Trade"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Risk Per Trade Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Risk Per Trade Percent</strong> מגדיר את אחוז הסיכון
                                    המקסימלי לכל עסקה. זה משמש לחישוב גודל הפוזיציה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-risk-per-trade-pct"
                          type="number"
                          step="0.1"
                          value={maxRiskPerTradePercent}
                          onChange={(e) => setMaxRiskPerTradePercent(e.target.value)}
                          placeholder="1"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-daily-drawdown-pct">Max Daily Drawdown (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Daily Drawdown"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Daily Drawdown Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Daily Drawdown Percent</strong> מגדיר את ה-Drawdown
                                    המקסימלי המותר ביום אחד. אם מושג, המערכת תעצור את המסחר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-daily-drawdown-pct"
                          type="number"
                          step="0.1"
                          value={maxDailyDrawdownPercent}
                          onChange={(e) => setMaxDailyDrawdownPercent(e.target.value)}
                          placeholder="5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPOSURE_LIMITS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">מגבלות חשיפה</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-symbol-exposure">Max Symbol Exposure (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Symbol Exposure"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Symbol Exposure Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Symbol Exposure Percent</strong> מגדיר את החשיפה
                                    המקסימלית למניה אחת באחוזים מהחשבון. זה מונע ריכוז יתר במניה
                                    אחת.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-symbol-exposure"
                          type="number"
                          value={maxSymbolExposurePercent}
                          onChange={(e) => setMaxSymbolExposurePercent(e.target.value)}
                          placeholder="20"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-sector-exposure">Max Sector Exposure (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Sector Exposure"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Sector Exposure Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Sector Exposure Percent</strong> מגדיר את החשיפה
                                    המקסימלית לסקטור אחד. זה מונע ריכוז יתר בסקטור מסוים.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-sector-exposure"
                          type="number"
                          value={maxSectorExposurePercent}
                          onChange={(e) => setMaxSectorExposurePercent(e.target.value)}
                          placeholder="30"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-open-positions">Max Open Positions</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max Open Positions"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Open Positions</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Open Positions</strong> מגדיר את מספר הפוזיציות
                                    המקסימלי שניתן להחזיק במקביל. זה מגביל את הפיזור ומוודא ניהול
                                    סיכונים טוב יותר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-open-positions"
                          type="number"
                          value={maxOpenPositions}
                          onChange={(e) => setMaxOpenPositions(e.target.value)}
                          placeholder="5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-risk-reward">Min Risk/Reward Ratio</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Risk/Reward"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Risk/Reward Ratio</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Risk/Reward Ratio</strong> מגדיר את היחס המקסימלי
                                    בין סיכון לתגמול. רק עסקאות עם יחס זה או טוב יותר יתקבלו. למשל,
                                    2.0 משמעותו שהתגמול צריך להיות לפחות פי 2 מהסיכון.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-risk-reward"
                          type="number"
                          step="0.1"
                          value={minRiskRewardRatio}
                          onChange={(e) => setMinRiskRewardRatio(e.target.value)}
                          placeholder="2.0"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="position-risk-weight">Position Risk Weight</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Position Risk Weight"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Position Risk Weight במאסטר סקורינג</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Position Risk Weight</strong> מגדיר את המשקל של מחלקת
                                    Position Risk במאסטר סקורינג. ברירת מחדל: 0.70. זה קובע כמה
                                    ניהול הסיכון משפיע על הציון הסופי.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="position-risk-weight"
                          type="number"
                          step="0.01"
                          value={positionRiskWeight}
                          onChange={(e) => setPositionRiskWeight(e.target.value)}
                          placeholder="0.70"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price-action-patterns" className="border-b border-border">
          <AccordionTrigger className="text-xl font-semibold hover:no-underline py-4">
            תבניות Price Action
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6">
            <div className="space-y-4">
              {/* תיאור המחלקה */}
              <div className="bg-muted/50 p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">
                  <strong>תיאור המחלקה:</strong> מחלקת תבניות Price Action מזהה תבניות מסחר טכניות
                  בנתוני המחיר והנפח. המחלקה מזהות תבניות כגון Double Top, Double Bottom, Breakout,
                  Breakdown, Gaps, Candles, ו-Trend Structure. כל תבנית מזוהה לפי פרמטרים ספציפיים
                  (כגון מרחק בין שיאים, נפח, ואישור) ומתורגמת לציון המשקף את הסיכוי להצלחה. המחלקה
                  עובדת על מספר timeframes ומספקת אותות כניסה ויציאה מפורטים.
                </p>
              </div>

              <div className="space-y-6">
                {/* ENABLED_PATTERNS */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">תבניות פעילות</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "Double Top", state: enableDoubleTop, setter: setEnableDoubleTop },
                      {
                        key: "Double Bottom",
                        state: enableDoubleBottom,
                        setter: setEnableDoubleBottom,
                      },
                      { key: "Breakout", state: enableBreakout, setter: setEnableBreakout },
                      { key: "Breakdown", state: enableBreakdown, setter: setEnableBreakdown },
                      { key: "Gaps", state: enableGaps, setter: setEnableGaps },
                      { key: "Candles", state: enableCandles, setter: setEnableCandles },
                      {
                        key: "Trend Structure",
                        state: enableTrendStructure,
                        setter: setEnableTrendStructure,
                      },
                    ].map((pattern) => (
                      <div key={pattern.key} className="space-y-2">
                        <Label>{pattern.key}</Label>
                        <div className="flex justify-end gap-3">
                          <Button
                            type="button"
                            variant={pattern.state === true ? "default" : "outline"}
                            className="max-w-md"
                            onClick={() => pattern.setter(true)}
                          >
                            פעיל
                          </Button>
                          <Button
                            type="button"
                            variant={pattern.state === false ? "default" : "outline"}
                            className="max-w-md"
                            onClick={() => pattern.setter(false)}
                          >
                            לא פעיל
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PATTERN_PARAMS (Double Top example) */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">פרמטרי תבנית (Double Top)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-drop-pct">Min Percentage Drop Between Tops (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Min Drop"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Percentage Drop Between Tops</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Percentage Drop Between Tops</strong> מגדיר את האחוז
                                    המינימלי של ירידה בין השיא הראשון לשני בתבנית Double Top. זה
                                    מבטיח שיש ירידה משמעותית בין השיאים.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-drop-pct"
                          type="number"
                          value={minPercentageDropBetweenTops}
                          onChange={(e) => setMinPercentageDropBetweenTops(e.target.value)}
                          placeholder="3"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-candle-distance">
                          Min Candle Distance Between Tops
                        </Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Candle Distance"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Candle Distance Between Tops</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Candle Distance Between Tops</strong> מגדיר את המרחק
                                    המינימלי בנרות בין השיא הראשון לשני. זה מבטיח שיש זמן מספיק בין
                                    השיאים.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-candle-distance"
                          type="number"
                          value={minCandleDistanceBetweenTops}
                          onChange={(e) => setMinCandleDistanceBetweenTops(e.target.value)}
                          placeholder="10"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="max-diff-tops">Max Difference Between Tops (%)</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Max Difference"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Max Difference Between Tops Percent</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Max Difference Between Tops Percent</strong> מגדיר את
                                    ההפרש המקסימלי המותר בין גובה השיא הראשון לשני. זה מבטיח ששני
                                    השיאים דומים בגובה.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="max-diff-tops"
                          type="number"
                          value={maxDifferenceBetweenTopsPercent}
                          onChange={(e) => setMaxDifferenceBetweenTopsPercent(e.target.value)}
                          placeholder="2"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="volume-requirement">Volume Requirement On Reversal</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Volume Requirement"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Volume Requirement On Reversal</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Volume Requirement On Reversal</strong> מגדיר את המכפיל
                                    המינימלי של נפח בעת היפוך. זה מבטיח שיש נפח מספיק לאישור התבנית.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="volume-requirement"
                          type="number"
                          step="0.1"
                          value={volumeRequirementOnReversal}
                          onChange={(e) => setVolumeRequirementOnReversal(e.target.value)}
                          placeholder="1.5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Neckline Break Confirmation</Label>
                      <div className="flex justify-end gap-3">
                        <Button
                          type="button"
                          variant={necklineBreakConfirmation === true ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setNecklineBreakConfirmation(true)}
                        >
                          כן
                        </Button>
                        <Button
                          type="button"
                          variant={necklineBreakConfirmation === false ? "default" : "outline"}
                          className="max-w-md"
                          onClick={() => setNecklineBreakConfirmation(false)}
                        >
                          לא
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 justify-end">
                        <Label htmlFor="min-pattern-strength">Min Pattern Strength</Label>
                        <Dialog>
                          <DialogTrigger asChild={true}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              aria-label="הסבר על Pattern Strength"
                            >
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl text-right">
                            <DialogHeader>
                              <DialogTitle>Min Pattern Strength</DialogTitle>
                              <DialogDescription asChild={true}>
                                <div className="space-y-4 mt-4 text-foreground">
                                  <p className="leading-relaxed">
                                    <strong>Min Pattern Strength</strong> מגדיר את החוזק המינימלי
                                    הנדרש לתבנית כדי להיות מוכרת. חוזק גבוה יותר משמעותו תבנית
                                    איכותית יותר.
                                  </p>
                                </div>
                              </DialogDescription>
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <div className="flex justify-end">
                        <Input
                          id="min-pattern-strength"
                          type="number"
                          value={minPatternStrength}
                          onChange={(e) => setMinPatternStrength(e.target.value)}
                          placeholder="5"
                          className="max-w-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}

export default function TradeRouterPage() {
  // State for Master Scoring System
  const [minMasterScoreForTrading, setMinMasterScoreForTrading] = useState<string>("6.0");
  const [longThreshold, setLongThreshold] = useState<string>("2.0");
  const [shortThreshold, setShortThreshold] = useState<string>("-2.0");
  const [maxSymbolsToRank, setMaxSymbolsToRank] = useState<string>("100");

  // Global Config - Trading Enabled
  const [tradingEnabled, setTradingEnabled] = useState<boolean>(true);

  // Global Config - Rescore Interval
  const [rescoreIntervalSeconds, setRescoreIntervalSeconds] = useState<string>("1");

  // Global Config - Module Weights (matching scoring_system.py defaults)
  const [moduleWeights, setModuleWeights] = useState({
    macro: "0.14", // w_macro from scoring_system.py
    sectorMacro: "0.14", // w_sector from scoring_system.py
    news: "0.22", // w_news from scoring_system.py
    technical: "0.26", // w_technical from scoring_system.py
    priceAction: "1.2", // Internal weight (part of technical)
    optionsFlow: "0.12", // w_options from scoring_system.py
    sentiment: "0.8", // Internal sentiment weight
    fundamentals: "0.75", // Internal fundamentals weight
    positionRisk: "0.70", // Internal position risk weight
    strategyContext: "1.0", // Internal strategy context weight
    micro: "0.12", // w_micro from scoring_system.py
  });

  // State for module enable/disable switches
  const [moduleStates, setModuleStates] = useState<Record<string, boolean | null>>({
    macro: true,
    sector: true,
    news: true,
    technical: true,
    options: true,
    pattern: true,
    strategyContext: true,
    positionRisk: true,
  });

  const handleModuleToggle = (moduleName: string, value: boolean) => {
    setModuleStates((prev) => ({
      ...prev,
      [moduleName]: value,
    }));
  };

  const handleModuleWeightChange = (moduleName: string, value: string) => {
    setModuleWeights((prev) => ({
      ...prev,
      [moduleName]: value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <StrategyKitHeader title="נתב מסחר" />

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Main content - with margin for fixed right sidebar */}
        <section className="mr-[30%] px-6 py-6">
          <div className="max-w-7xl mx-auto">
            <Tabs defaultValue="scoring" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="backtest">backtest</TabsTrigger>
                <TabsTrigger value="execution">מערכת הביצועים</TabsTrigger>
                <TabsTrigger value="scanning">מערכת הסריקה</TabsTrigger>
                <TabsTrigger value="scoring">מערכת הניקוד</TabsTrigger>
              </TabsList>

              <TabsContent value="backtest" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>backtest</CardTitle>
                    <CardDescription>בדיקת ביצועים היסטוריים של האסטרטגיה</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">תוכן backtest יוצג כאן.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="execution" className="space-y-4">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle>מערכת הביצועים</CardTitle>
                    <CardDescription>ניהול והגדרת מערכת הביצועים לביצוע עסקאות</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-right" suppressHydrationWarning={true}>
                      <ExecutionAccordionContent />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scanning" className="space-y-4">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle>מערכת הסריקה</CardTitle>
                    <CardDescription>ניהול והגדרת מערכת הסריקה לזיהוי דפוסים</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-right" suppressHydrationWarning={true}>
                      <ScanningAccordionContent />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scoring" className="space-y-4">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle>מערכת הניקוד</CardTitle>
                    <CardDescription>ניהול והגדרת מערכת הניקוד לניתוח שוק</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-right">
                      <ScoringAccordionContent />

                      {/* Master Scoring System - ללא Accordion */}
                      <div className="pt-6 border-t border-border">
                        <h1 className="text-3xl font-bold mb-6">Master Scoring System</h1>

                        {/* הגדרות כלליות */}
                        <div className="space-y-6 mb-8">
                          <h3 className="text-xl font-medium mb-4">הגדרות כלליות</h3>

                          {/* Direction Threshold */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="direction-threshold">
                                סף לקביעת כיוון (Direction Threshold)
                              </Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על סף לקביעת כיוון"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>סף לקביעת כיוון (Direction Threshold)</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Direction Threshold</strong> הוא פרמטר במערכת
                                          Master Scoring שקובע מתי הציון מספיק חזק כדי לקבוע כיוון
                                          מסחר.
                                        </p>
                                        <div className="space-y-2">
                                          <p>
                                            <strong>איך זה עובד:</strong>
                                          </p>
                                          <ul className="list-disc list-inside space-y-1 mr-4">
                                            <li>
                                              אם הציון הסופי ≥ ערך הסף → כיוון:{" "}
                                              <strong>LONG</strong> (שורי - לקנות)
                                            </li>
                                            <li>
                                              אם הציון הסופי ≤ ערך הסף שלילי → כיוון:{" "}
                                              <strong>SHORT</strong> (דובי - למכור)
                                            </li>
                                            <li>
                                              אם הציון בין הערכים → כיוון: <strong>NEUTRAL</strong>{" "}
                                              (נייטרלי - לא לפעול)
                                            </li>
                                          </ul>
                                        </div>
                                        <div className="space-y-2">
                                          <p>
                                            <strong>דוגמה עם ערך ברירת מחדל (2.0):</strong>
                                          </p>
                                          <ul className="list-disc list-inside space-y-1 mr-4">
                                            <li>ציון 1.5 → נייטרלי (לא מספיק חזק לפעולה)</li>
                                            <li>ציון 2.5 → LONG (חזק מספיק לפעולה)</li>
                                            <li>ציון -2.5 → SHORT (חזק מספיק לפעולה)</li>
                                          </ul>
                                        </div>
                                        <p className="leading-relaxed">
                                          <strong>למה זה חשוב?</strong> הפרמטר מסנן אותות חלשים
                                          ומונע פעולה כשאין ביטחון מספיק בכיוון. ככל שהערך גבוה
                                          יותר, הדרישה לעוצמה גבוהה יותר לפני קביעת כיוון. ערך 2.0
                                          הוא ברירת המחדל ונחשב מאוזן.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="direction-threshold"
                                type="number"
                                step="0.1"
                                value={longThreshold}
                                onChange={(e) => setLongThreshold(e.target.value)}
                                placeholder="למשל: 2.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Min Master Score For Trading */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="min-master-score-trading">
                                ציון Master מינימלי למסחר
                              </Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על ציון Master מינימלי"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>ציון Master מינימלי למסחר</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Min Master Score For Trading</strong> מגדיר את
                                          הציון המינימלי שהמניה חייבת להשיג כדי להיות מועמדת למסחר.
                                          מניות עם ציון נמוך יותר לא ייכללו ברשימת ההזדמנויות.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="min-master-score-trading"
                                type="number"
                                step="0.1"
                                value={minMasterScoreForTrading}
                                onChange={(e) => setMinMasterScoreForTrading(e.target.value)}
                                placeholder="למשל: 6.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Long Threshold */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="long-threshold">סף Long (Long Threshold)</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על Long Threshold"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>סף Long (Long Threshold)</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Long Threshold</strong> מגדיר את הציון המינימלי
                                          הנדרש כדי לקבוע כיוון LONG (שורי - לקנות). אם הציון הסופי
                                          ≥ ערך זה, הכיוון יהיה LONG.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="long-threshold"
                                type="number"
                                step="0.1"
                                value={longThreshold}
                                onChange={(e) => setLongThreshold(e.target.value)}
                                placeholder="למשל: 2.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Short Threshold */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="short-threshold">סף Short (Short Threshold)</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על Short Threshold"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>סף Short (Short Threshold)</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Short Threshold</strong> מגדיר את הציון המקסימלי
                                          (שלילי) הנדרש כדי לקבוע כיוון SHORT (דובי - למכור). אם
                                          הציון הסופי ≤ ערך זה (שלילי), הכיוון יהיה SHORT.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="short-threshold"
                                type="number"
                                step="0.1"
                                value={shortThreshold}
                                onChange={(e) => setShortThreshold(e.target.value)}
                                placeholder="למשל: -2.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Max Symbols To Rank */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="max-symbols-rank">מספר מקסימלי של מניות לדירוג</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על Max Symbols To Rank"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>מספר מקסימלי של מניות לדירוג</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Max Symbols To Rank</strong> מגביל את מספר המניות
                                          המקסימלי שמועמדות לדירוג במערכת Master Scoring. זה מסייע
                                          לשלוט בעומס המערכת ולחזור רק את המניות המובילות.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="max-symbols-rank"
                                type="number"
                                value={maxSymbolsToRank}
                                onChange={(e) => setMaxSymbolsToRank(e.target.value)}
                                placeholder="למשל: 100"
                                className="max-w-md"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Global Config - Trading Enabled */}
                        <div className="space-y-6 mb-8">
                          <h3 className="text-xl font-medium mb-4">הגדרות גלובליות</h3>

                          {/* Trading Enabled */}
                          <div className="space-y-2">
                            <Label>האם להפעיל מסחר (Trading Enabled)?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={tradingEnabled === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => setTradingEnabled(true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={tradingEnabled === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => setTradingEnabled(false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Rescore Interval Seconds */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="rescore-interval">מרווח עדכון ניקוד (שניות)</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על מרווח עדכון ניקוד"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>מרווח עדכון ניקוד (שניות)</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>Rescore Interval Seconds</strong> מגדיר כמה פעמים
                                          בשנייה המערכת מעדכנת את הניקוד. ערך נמוך יותר = עדכונים
                                          תכופים יותר, אבל יותר עומס על המערכת. ברירת מחדל: 1 שנייה.
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="rescore-interval"
                                type="number"
                                step="0.1"
                                value={rescoreIntervalSeconds}
                                onChange={(e) => setRescoreIntervalSeconds(e.target.value)}
                                placeholder="1"
                                className="max-w-md"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Global Config - Module Weights */}
                        <div className="space-y-6 mb-8">
                          <h3 className="text-xl font-medium mb-4">
                            משקלי מודולים (Module Weights)
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            משקלים גלובליים לכל מודול במערכת Master Scoring. משקלים גבוהים יותר =
                            השפעה גדולה יותר על הניקוד הסופי.
                          </p>

                          {/* Macro Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-macro">משקל Macro</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Macro"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Macro</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Macro</strong> קובע את ההשפעה של ניתוח מאקרו
                                          (Market Trend, Volatility, Rates, Credit Risk, Breadth,
                                          Sentiment) על הניקוד הסופי במאסטר סקורינג. ברירת מחדל:
                                          0.14 (מתוך scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-macro"
                                type="number"
                                step="0.01"
                                value={moduleWeights.macro}
                                onChange={(e) => handleModuleWeightChange("macro", e.target.value)}
                                placeholder="0.9"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Sector Macro Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-sector-macro">משקל Sector Macro</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Sector Macro"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Sector Macro</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Sector Macro</strong> קובע את ההשפעה של ניתוח
                                          סקטורים (Sector Trend, Relative Strength, Momentum,
                                          Volatility, Rotation) על הניקוד הסופי במאסטר סקורינג.
                                          ברירת מחדל: 0.14 (מתוך scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-sector-macro"
                                type="number"
                                step="0.01"
                                value={moduleWeights.sectorMacro}
                                onChange={(e) =>
                                  handleModuleWeightChange("sectorMacro", e.target.value)
                                }
                                placeholder="0.9"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* News Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-news">משקל News</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל News"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל News</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל News</strong> קובע את ההשפעה של חדשות מיקרו
                                          (חברתיות) על הניקוד הסופי במאסטר סקורינג. ברירת מחדל: 0.22
                                          (מתוך scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-news"
                                type="number"
                                step="0.01"
                                value={moduleWeights.news}
                                onChange={(e) => handleModuleWeightChange("news", e.target.value)}
                                placeholder="1.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Technical Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-technical">משקל Technical</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Technical"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Technical</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Technical</strong> קובע את ההשפעה של
                                          אינדיקטורים טכניים (RSI, MACD, SMA, VWAP, Volume, ATR,
                                          Bollinger) על הניקוד הסופי במאסטר סקורינג. ברירת מחדל:
                                          0.26 (מתוך scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-technical"
                                type="number"
                                step="0.01"
                                value={moduleWeights.technical}
                                onChange={(e) =>
                                  handleModuleWeightChange("technical", e.target.value)
                                }
                                placeholder="1.2"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Price Action Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-price-action">משקל Price Action</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Price Action"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Price Action</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Price Action</strong> קובע את המשקל הפנימי של
                                          תבניות Price Action בתוך מחלקת Technical Indicators. זה
                                          משקל פנימי (לא במאסטר סקורינג ישירות). ברירת מחדל: 1.2
                                          (משקל פנימי לקבוצת PRICE_ACTION)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-price-action"
                                type="number"
                                step="0.01"
                                value={moduleWeights.priceAction}
                                onChange={(e) =>
                                  handleModuleWeightChange("priceAction", e.target.value)
                                }
                                placeholder="1.2"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Options Flow Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-options-flow">משקל Options Flow</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Options Flow"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Options Flow</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Options Flow</strong> קובע את ההשפעה של זרימת
                                          אופציות (Put/Call Ratio, UOA, IV, Skew, Gamma) על הניקוד
                                          הסופי במאסטר סקורינג. ברירת מחדל: 0.12 (מתוך
                                          scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-options-flow"
                                type="number"
                                step="0.01"
                                value={moduleWeights.optionsFlow}
                                onChange={(e) =>
                                  handleModuleWeightChange("optionsFlow", e.target.value)
                                }
                                placeholder="0.12"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Sentiment Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-sentiment">משקל Sentiment</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Sentiment"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Sentiment</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Sentiment</strong> קובע את המשקל הפנימי של
                                          סנטימנט (טוויטר, רדיט, חדשות, רגש שוק) במערכת הניקוד. זה
                                          משקל פנימי בתוך מחלקת Sentiment. ברירת מחדל: 0.8 (משקל
                                          פנימי)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-sentiment"
                                type="number"
                                step="0.01"
                                value={moduleWeights.sentiment}
                                onChange={(e) =>
                                  handleModuleWeightChange("sentiment", e.target.value)
                                }
                                placeholder="0.8"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Fundamentals Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-fundamentals">משקל Fundamentals</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Fundamentals"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Fundamentals</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Fundamentals</strong> קובע את המשקל הפנימי של
                                          ניתוח יסודות (PE, ROE, Growth, Profitability, וכו') במערכת
                                          הניקוד. זה משקל פנימי בתוך מחלקת Fundamentals. ברירת מחדל:
                                          0.75 (משקל פנימי)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-fundamentals"
                                type="number"
                                step="0.01"
                                value={moduleWeights.fundamentals}
                                onChange={(e) =>
                                  handleModuleWeightChange("fundamentals", e.target.value)
                                }
                                placeholder="0.75"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Position Risk Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-position-risk">משקל Position Risk</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Position Risk"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Position Risk</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Position Risk</strong> קובע את המשקל הפנימי
                                          של ניהול סיכון פוזיציה (Account Risk, Position Risk,
                                          Exposure Limits) במערכת הניקוד. זה משקל פנימי בתוך מחלקת
                                          Position Risk. ברירת מחדל: 0.70 (משקל פנימי)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-position-risk"
                                type="number"
                                step="0.01"
                                value={moduleWeights.positionRisk}
                                onChange={(e) =>
                                  handleModuleWeightChange("positionRisk", e.target.value)
                                }
                                placeholder="0.7"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Strategy Context Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-strategy-context">משקל Strategy Context</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Strategy Context"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Strategy Context</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Strategy Context</strong> קובע את המשקל
                                          הפנימי של הקשר אסטרטגי (התאמה בין אסטרטגיות זיהוי תבניות
                                          לכיוון המסחר) במערכת הסריקה. זה משקל פנימי בתוך מערכת
                                          הסריקה. ברירת מחדל: 1.0 (משקל פנימי)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-strategy-context"
                                type="number"
                                step="0.01"
                                value={moduleWeights.strategyContext}
                                onChange={(e) =>
                                  handleModuleWeightChange("strategyContext", e.target.value)
                                }
                                placeholder="1.0"
                                className="max-w-md"
                              />
                            </div>
                          </div>

                          {/* Micro Company Weight */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 justify-end">
                              <Label htmlFor="weight-micro">משקל Micro Company</Label>
                              <Dialog>
                                <DialogTrigger asChild={true}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    aria-label="הסבר על משקל Micro Company"
                                  >
                                    <Info className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl text-right">
                                  <DialogHeader>
                                    <DialogTitle>משקל Micro Company</DialogTitle>
                                    <DialogDescription asChild={true}>
                                      <div className="space-y-4 mt-4 text-foreground">
                                        <p className="leading-relaxed">
                                          <strong>משקל Micro Company</strong> קובע את ההשפעה של
                                          חדשות מיקרו-חברה (דוחות רווח, הנחיות, דילול, רכישות
                                          עצמיות, שינויי הנהלה) על הניקוד הסופי במאסטר סקורינג.
                                          ברירת מחדל: 0.12 (מתוך scoring_system.py)
                                        </p>
                                      </div>
                                    </DialogDescription>
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <div className="flex justify-end">
                              <Input
                                id="weight-micro"
                                type="number"
                                step="0.01"
                                value={moduleWeights.micro}
                                onChange={(e) => handleModuleWeightChange("micro", e.target.value)}
                                placeholder="0.12"
                                className="max-w-md"
                              />
                            </div>
                          </div>
                        </div>

                        {/* הפעלה/כיבוי מחלקות */}
                        <div className="space-y-6">
                          <h3 className="text-xl font-medium mb-4">הפעלה/כיבוי מחלקות</h3>

                          {/* Use Macro */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Macro?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.macro === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("macro", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.macro === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("macro", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Sector */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Sector?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.sector === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("sector", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.sector === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("sector", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use News */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת News (חדשות)?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.news === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("news", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.news === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("news", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Technical */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Technical (אינדיקטורים)?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.technical === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("technical", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.technical === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("technical", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Options */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Options (זרימת אופציות)?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.options === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("options", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.options === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("options", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Pattern */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Pattern?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.pattern === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("pattern", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={moduleStates.pattern === false ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("pattern", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Strategy Context */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Strategy Context?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={
                                  moduleStates.strategyContext === true ? "default" : "outline"
                                }
                                className="max-w-md"
                                onClick={() => handleModuleToggle("strategyContext", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  moduleStates.strategyContext === false ? "default" : "outline"
                                }
                                className="max-w-md"
                                onClick={() => handleModuleToggle("strategyContext", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>

                          {/* Use Position Risk */}
                          <div className="space-y-2">
                            <Label>האם להשתמש במחלקת Position Risk (סיכון פוזיציה)?</Label>
                            <div className="flex justify-end gap-3">
                              <Button
                                type="button"
                                variant={moduleStates.positionRisk === true ? "default" : "outline"}
                                className="max-w-md"
                                onClick={() => handleModuleToggle("positionRisk", true)}
                              >
                                כן
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  moduleStates.positionRisk === false ? "default" : "outline"
                                }
                                className="max-w-md"
                                onClick={() => handleModuleToggle("positionRisk", false)}
                              >
                                לא
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Right Sidebar - Fixed to right edge (AI Chat) - 30% width */}
        <aside
          className="fixed right-0 bottom-0 w-[30%] p-6 overflow-y-auto border-r bg-background"
          style={{ top: "calc(64px + 1rem)" }}
        >
          <AIChatPanel />
        </aside>
      </main>
    </div>
  );
}
