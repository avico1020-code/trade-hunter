"use client";

/**
 * CandlestickChart Component
 *
 * גרף נרות מקצועי בסגנון TradingView
 * - Real-time updates via SSE
 * - Zoom, pan, crosshair
 * - Dark TradingView theme
 */

import { useEffect, useRef, useState } from "react";
import type { Timeframe } from "./TimeframeSelector";

interface CandlestickChartProps {
  symbol: string;
  timeframe: Timeframe;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function CandlestickChart({ symbol, timeframe }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isSubscribedRef = useRef<boolean>(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Initialize chart (browser-only)
  useEffect(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    // CRITICAL: Prevent double initialization (React Strict Mode)
    if (chartRef.current) {
      console.log(`[CandlestickChart] ⚠️ Chart already exists, skipping initialization`);
      return;
    }

    let chart: any;
    let series: any;

    const initChart = async () => {
      try {
        // Wait for container to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!containerRef.current) {
          console.error("[CandlestickChart] Container ref is null!");
          return;
        }

        // Double-check chart doesn't exist (race condition protection)
        if (chartRef.current) {
          console.log(`[CandlestickChart] ⚠️ Chart already exists during init, aborting`);
          return;
        }

        // Dynamic import for browser-only library
        const LightweightCharts = await import("lightweight-charts");
        const { createChart } = LightweightCharts;

        // Check container dimensions - use getBoundingClientRect for accurate size
        const rect = containerRef.current.getBoundingClientRect();
        const containerWidth = rect.width || containerRef.current.clientWidth || 800;
        const containerHeight = rect.height || containerRef.current.clientHeight || 500;

        console.log(
          `[CandlestickChart] Container dimensions: ${containerWidth}x${containerHeight}`
        );
        console.log(`[CandlestickChart] Container rect:`, rect);

        if (containerWidth === 0 || containerHeight === 0) {
          console.warn(`[CandlestickChart] ⚠️ Container has zero dimensions! Using defaults.`);
          // Use minimum dimensions
          const minWidth = 800;
          const minHeight = 500;
          containerRef.current.style.width = `${minWidth}px`;
          containerRef.current.style.height = `${minHeight}px`;
        }

        // Create chart with TradingView-like settings
        chart = createChart(containerRef.current!, {
          width: containerWidth || 800,
          height: containerHeight || 500,
          layout: {
            background: { color: "#0f0f0f" },
            textColor: "#d1d4dc",
          },
          grid: {
            vertLines: { color: "#1f1f1f" },
            horzLines: { color: "#1f1f1f" },
          },
          crosshair: {
            mode: 1, // Normal crosshair
            vertLine: {
              color: "#758696",
              width: 1,
              style: 3,
              labelBackgroundColor: "#2962ff",
            },
            horzLine: {
              color: "#758696",
              width: 1,
              style: 3,
              labelBackgroundColor: "#2962ff",
            },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            rightBarStaysOnScroll: true,
            borderColor: "#2b2b43",
          },
          // Hide left price scale
          leftPriceScale: {
            visible: false,
          },
          // Right price scale (main price scale with full price range)
          rightPriceScale: {
            visible: true,
            borderColor: "#2b2b43",
            entireTextOnly: false,
          },
          handleScroll: {
            mouseWheel: true,
            pressedMouseMove: true,
            horzTouchDrag: true,
            vertTouchDrag: false,
          },
          handleScale: {
            axisPressedMouseMove: true,
            mouseWheel: true,
            pinch: true,
          },
        });

        // Add candlestick series (v4.x API)
        // Use right price scale (will show full price range on the right)
        series = chart.addCandlestickSeries({
          upColor: "#26a69a",
          downColor: "#ef5350",
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
          borderVisible: false,
          priceScaleId: "right", // Use right price scale
        });

        // CRITICAL: Set right price scale to auto-scale
        // This ensures candles are visible regardless of price range
        chart.priceScale("right").applyOptions({
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });

        // CRITICAL: Validate series was created BEFORE setting refs
        if (!series) {
          console.error(`[CandlestickChart] ❌ Failed to create series!`);
          chart.remove(); // Clean up chart
          return;
        }

        // CRITICAL: Validate series type BEFORE setting refs
        let seriesType: string;
        try {
          seriesType = series.seriesType();
          if (seriesType !== "Candlestick") {
            console.error(
              `[CandlestickChart] ❌ Wrong series type: ${seriesType} (expected Candlestick)`
            );
            chart.remove(); // Clean up chart
            return;
          }
        } catch (err) {
          console.error(`[CandlestickChart] ❌ Error getting series type:`, err);
          chart.remove(); // Clean up chart
          return;
        }

        // Only set refs if everything is valid
        chartRef.current = chart;
        seriesRef.current = series;

        console.log(`[CandlestickChart] ✅ Refs set:`, {
          hasChart: !!chartRef.current,
          hasSeries: !!seriesRef.current,
        });

        console.log(`[CandlestickChart] ✅ Chart created successfully`);
        console.log(`[CandlestickChart] ✅ Series created:`, {
          type: seriesType,
          chartDimensions: `${containerWidth}x${containerHeight}`,
          containerElement: !!containerRef.current,
          chartElement: !!chartRef.current,
        });

        // Fit content initially (empty chart)
        chart.timeScale().fitContent();

        // Subscribe to crosshair move to show price on hover
        // The crosshair automatically shows the price on the right price scale
        // No additional code needed - TradingView Lightweight Charts handles this automatically

        // Verify chart is visible and properly sized
        setTimeout(() => {
          if (chartRef.current && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            console.log(`[CandlestickChart] Container rect after init:`, rect);

            // Ensure chart matches container size
            chartRef.current.applyOptions({
              width: rect.width,
              height: rect.height,
            });

            const chartElement = containerRef.current.querySelector("canvas");
            console.log(`[CandlestickChart] Chart canvas element:`, chartElement);
            if (chartElement) {
              console.log(
                `[CandlestickChart] Canvas dimensions: ${chartElement.width}x${chartElement.height}`
              );
            }
          }
        }, 200);

        setIsChartReady(true);
        console.log(`[CandlestickChart] ✅ Chart is ready!`);

        // Handle window resize and container size changes
        const handleResize = () => {
          if (containerRef.current && chartRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            chartRef.current.applyOptions({
              width: rect.width,
              height: rect.height,
            });
            console.log(`[CandlestickChart] Resized to: ${rect.width}x${rect.height}`);
          }
        };

        // Use ResizeObserver to detect container size changes
        let resizeObserver: ResizeObserver | null = null;
        if (containerRef.current && typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(handleResize);
          resizeObserver.observe(containerRef.current);
        }

        window.addEventListener("resize", handleResize);

        return () => {
          window.removeEventListener("resize", handleResize);
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
        };
      } catch (error) {
        console.error("[CandlestickChart] ❌ Failed to initialize chart:", error);
        console.error("[CandlestickChart] Error details:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        setDataError(
          `Failed to initialize chart: ${error instanceof Error ? error.message : String(error)}`
        );
        setIsChartReady(false);
      }
    };

    initChart().catch((error) => {
      console.error("[CandlestickChart] ❌ Unhandled error in initChart:", error);
      setDataError("Failed to initialize chart");
      setIsChartReady(false);
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
        setIsChartReady(false);
      }
    };
  }, []);

  // Load data and subscribe to updates
  useEffect(() => {
    // Reset state when symbol/timeframe changes
    setHasData(false);
    setDataError(null);

    // CRITICAL: Retry logic - wait for chart to be ready
    // Check refs directly (not state) to avoid stale closures
    const tryLoadData = async () => {
      let retries = 0;
      const maxRetries = 30; // Wait up to 3 seconds (30 * 100ms)

      while (retries < maxRetries) {
        // Check refs directly - if they exist, chart is ready
        if (seriesRef.current && chartRef.current) {
          // Double-check that series is valid
          try {
            const seriesType = seriesRef.current.seriesType();
            if (seriesType === "Candlestick") {
              console.log(
                `[CandlestickChart] ✅ Chart is ready, loading data for ${symbol} (${timeframe})...`
              );
              break;
            }
          } catch (err) {
            // Series exists but not fully initialized yet
            console.log(
              `[CandlestickChart] ⏳ Series exists but not ready yet (attempt ${retries + 1}/${maxRetries})...`
            );
          }
        }

        console.log(
          `[CandlestickChart] ⏳ Waiting for chart to be ready (attempt ${retries + 1}/${maxRetries})...`,
          {
            hasSeries: !!seriesRef.current,
            hasChart: !!chartRef.current,
            isChartReady,
          }
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      // If chart still not ready after retries, abort
      if (!seriesRef.current || !chartRef.current) {
        console.warn(
          `[CandlestickChart] ⚠️ Chart still not ready after ${maxRetries} retries, continuing with deferred checks...`,
          {
            hasSeries: !!seriesRef.current,
            hasChart: !!chartRef.current,
            isChartReady,
          }
        );
      }

      // Final validation
      if (seriesRef.current && chartRef.current) {
        try {
          const seriesType = seriesRef.current.seriesType();
          if (seriesType !== "Candlestick") {
            console.error(`[CandlestickChart] ❌ Series type is wrong: ${seriesType}`);
            setDataError(`Invalid series type: ${seriesType}`);
            return;
          }
        } catch (err) {
          console.error(`[CandlestickChart] ❌ Error validating series:`, err);
          setDataError("Series not properly initialized");
          return;
        }
      }

      // Reset subscription flag
      isSubscribedRef.current = true;

      // Now load data
      const loadAndSubscribe = async () => {
        try {
          // CRITICAL: Clear existing data before loading new data
          if (seriesRef.current) {
            console.log(`[CandlestickChart] 🧹 Clearing existing data for new symbol/timeframe...`);
            try {
              seriesRef.current.setData([]);
              // Small delay to ensure clear completes
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (err) {
              console.warn(`[CandlestickChart] ⚠️ Error clearing data:`, err);
            }
          }

          // 1. Load initial candles
          console.log(`[CandlestickChart] Loading bars for ${symbol} (${timeframe})`);

          const response = await fetch(
            `/api/market/bars?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`
          );

          if (!response.ok) {
            console.error(`[CandlestickChart] Failed to load bars: ${response.status}`);
            setDataError(`Failed to load data: ${response.status}`);
            return;
          }

          const bars: CandleData[] = await response.json();

          // CRITICAL: Validate series is ready (with retry)
          if (!isSubscribedRef.current) {
            console.warn(`[CandlestickChart] ⚠️ Component unsubscribed, aborting`);
            return;
          }

          // Retry logic: wait for series to be ready (max 5 attempts, 100ms each)
          let retries = 0;
          while (!seriesRef.current && retries < 5) {
            console.log(
              `[CandlestickChart] ⏳ Waiting for series to be ready (attempt ${retries + 1}/5)...`
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
            retries++;
          }

          if (!seriesRef.current) {
            console.error(
              `[CandlestickChart] ❌ Series is NULL after ${retries} retries! Cannot set data.`
            );
            setDataError("Chart series not ready");
            return;
          }

          if (!chartRef.current) {
            console.error(`[CandlestickChart] ❌ Chart is NULL! Cannot set data.`);
            setDataError("Chart not ready");
            return;
          }

          // Double-check subscription status after retry
          if (!isSubscribedRef.current) {
            console.warn(`[CandlestickChart] ⚠️ Component unsubscribed during retry, aborting`);
            return;
          }

          console.log(`[CandlestickChart] Loaded ${bars.length} bars from API`);

          // CRITICAL: Validate empty response
          if (bars.length === 0) {
            console.warn(`[CandlestickChart] ⚠️ No bars received from API!`);
            console.warn(`[CandlestickChart] This means the API returned an empty array.`);
            setHasData(false);
            setDataError("No data available for this symbol");
            return;
          }

          setDataError(null);

          // CRITICAL: Validate first candle format
          const firstBar = bars[0];
          console.log(`[CandlestickChart] First bar from API:`, firstBar);
          console.log(`[CandlestickChart] Bar time type:`, typeof firstBar.time);
          console.log(`[CandlestickChart] Bar time value:`, firstBar.time);

          // CRITICAL: Validate time is in SECONDS (not milliseconds)
          if (typeof firstBar.time !== "number") {
            console.error(`[CandlestickChart] ❌ Time is not a number:`, firstBar.time);
            return;
          }

          if (firstBar.time > 10000000000) {
            console.error(
              `[CandlestickChart] ❌ Time is in MILLISECONDS (${firstBar.time})! Should be in seconds.`
            );
            console.error(
              `[CandlestickChart] This is a CRITICAL API bug - time must be in seconds.`
            );
            return;
          }

          console.log(
            `[CandlestickChart] ✅ Time is in seconds: ${firstBar.time} (${new Date(firstBar.time * 1000).toISOString()})`
          );

          // Validate price values
          if (
            !isFinite(firstBar.open) ||
            !isFinite(firstBar.high) ||
            !isFinite(firstBar.low) ||
            !isFinite(firstBar.close)
          ) {
            console.error(`[CandlestickChart] ❌ Invalid price values in first bar:`, firstBar);
            return;
          }

          if (
            firstBar.open <= 0 ||
            firstBar.high <= 0 ||
            firstBar.low <= 0 ||
            firstBar.close <= 0
          ) {
            console.error(
              `[CandlestickChart] ❌ Non-positive price values in first bar:`,
              firstBar
            );
            return;
          }

          // Validate all bars have required fields and correct format
          const validBars = bars.filter((bar, index) => {
            // Validate time is a number in seconds
            if (typeof bar.time !== "number") {
              console.warn(`[CandlestickChart] ❌ Bar ${index}: time is not a number:`, bar.time);
              return false;
            }

            if (bar.time > 10000000000) {
              console.warn(
                `[CandlestickChart] ❌ Bar ${index}: time is in milliseconds (${bar.time})! API bug.`
              );
              return false;
            }

            // Validate prices
            if (
              typeof bar.open !== "number" ||
              typeof bar.high !== "number" ||
              typeof bar.low !== "number" ||
              typeof bar.close !== "number"
            ) {
              console.warn(`[CandlestickChart] ❌ Bar ${index}: invalid price types:`, bar);
              return false;
            }

            if (
              !isFinite(bar.open) ||
              !isFinite(bar.high) ||
              !isFinite(bar.low) ||
              !isFinite(bar.close)
            ) {
              console.warn(`[CandlestickChart] ❌ Bar ${index}: non-finite prices:`, bar);
              return false;
            }

            if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
              console.warn(`[CandlestickChart] ❌ Bar ${index}: non-positive prices:`, bar);
              return false;
            }

            return true;
          });

          console.log(`[CandlestickChart] Valid bars: ${validBars.length} / ${bars.length}`);

          if (validBars.length === 0) {
            console.error(`[CandlestickChart] ❌ No valid bars to display!`);
            return;
          }

          // CRITICAL: Sort bars by time (ascending) - required by lightweight-charts
          const sortedBars = [...validBars].sort((a, b) => a.time - b.time);

          // Log time range for debugging
          const firstTime = sortedBars[0].time;
          const lastTime = sortedBars[sortedBars.length - 1].time;

          console.log(`[CandlestickChart] ✅ Time range: ${firstTime} to ${lastTime}`);
          console.log(`[CandlestickChart] ✅ First bar:`, {
            time: firstTime,
            timeDate: new Date(firstTime * 1000).toISOString(),
            open: sortedBars[0].open,
            high: sortedBars[0].high,
            low: sortedBars[0].low,
            close: sortedBars[0].close,
          });
          console.log(`[CandlestickChart] ✅ Last bar:`, {
            time: lastTime,
            timeDate: new Date(lastTime * 1000).toISOString(),
            open: sortedBars[sortedBars.length - 1].open,
            high: sortedBars[sortedBars.length - 1].high,
            low: sortedBars[sortedBars.length - 1].low,
            close: sortedBars[sortedBars.length - 1].close,
          });

          // CRITICAL: Validate container dimensions
          if (!containerRef.current) {
            console.error(`[CandlestickChart] ❌ Container ref is null!`);
            return;
          }

          const containerRect = containerRef.current.getBoundingClientRect();
          if (containerRect.height === 0) {
            console.error(`[CandlestickChart] ❌ Container height is 0! Chart cannot render.`);
            console.error(`[CandlestickChart] Container rect:`, containerRect);
            return;
          }

          // CRITICAL: Double-check series is ready (with retry)
          let seriesRetries = 0;
          while ((!seriesRef.current || !chartRef.current) && seriesRetries < 5) {
            console.log(
              `[CandlestickChart] ⏳ Waiting for series/chart (attempt ${seriesRetries + 1}/5)...`
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
            seriesRetries++;
          }

          if (!seriesRef.current) {
            console.error(`[CandlestickChart] ❌ Series is null after ${seriesRetries} retries!`);
            setDataError("Chart series not ready");
            return;
          }

          if (!chartRef.current) {
            console.error(`[CandlestickChart] ❌ Chart is null after ${seriesRetries} retries!`);
            setDataError("Chart not ready");
            return;
          }

          // CRITICAL: Validate series type
          try {
            const seriesType = seriesRef.current.seriesType();
            if (seriesType !== "Candlestick") {
              console.error(`[CandlestickChart] ❌ Series type is wrong: ${seriesType}`);
              setDataError(`Invalid series type: ${seriesType}`);
              return;
            }
          } catch (err) {
            console.error(`[CandlestickChart] ❌ Error getting series type:`, err);
            setDataError("Series not initialized");
            return;
          }

          // Double-check subscription after retry
          if (!isSubscribedRef.current) {
            console.warn(
              `[CandlestickChart] ⚠️ Component unsubscribed during series retry, aborting`
            );
            return;
          }

          console.log(`[CandlestickChart] ✅ All validations passed before setData:`, {
            containerHeight: containerRect.height,
            containerWidth: containerRect.width,
            hasSeries: !!seriesRef.current,
            hasChart: !!chartRef.current,
            seriesType: seriesRef.current.seriesType(),
            symbol,
            timeframe,
          });

          try {
            // CRITICAL: Clear existing data first
            console.log(`[CandlestickChart] 🧹 Clearing existing data before setting new data...`);
            try {
              seriesRef.current.setData([]);
              // Small delay to ensure clear completes
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (err) {
              console.warn(`[CandlestickChart] ⚠️ Error clearing data:`, err);
            }

            // Double-check subscription after delay
            if (!isSubscribedRef.current) {
              console.warn(`[CandlestickChart] ⚠️ Component unsubscribed during clear, aborting`);
              return;
            }

            // CRITICAL: Final validation before setData
            if (!seriesRef.current) {
              console.error(`[CandlestickChart] ❌ Series is null right before setData!`);
              setDataError("Series not ready");
              return;
            }

            if (!chartRef.current) {
              console.error(`[CandlestickChart] ❌ Chart is null right before setData!`);
              setDataError("Chart not ready");
              return;
            }

            // CRITICAL: Set new data
            console.log(
              `[CandlestickChart] 📊 Calling setData with ${sortedBars.length} bars for ${symbol}...`
            );
            console.log(`[CandlestickChart] Series type:`, seriesRef.current.seriesType());
            console.log(`[CandlestickChart] Chart ready:`, !!chartRef.current);
            console.log(
              `[CandlestickChart] First bar time:`,
              sortedBars[0].time,
              `(${new Date(sortedBars[0].time * 1000).toISOString()})`
            );
            console.log(
              `[CandlestickChart] Last bar time:`,
              sortedBars[sortedBars.length - 1].time,
              `(${new Date(sortedBars[sortedBars.length - 1].time * 1000).toISOString()})`
            );

            // CRITICAL: setData must be called synchronously
            seriesRef.current.setData(sortedBars);
            console.log(`[CandlestickChart] ✅ Data set successfully for ${symbol}`);

            setHasData(true);
            setDataError(null);

            // CRITICAL: Use requestAnimationFrame to ensure chart renders
            requestAnimationFrame(() => {
              if (!chartRef.current || !seriesRef.current) return;

              try {
                // Resize chart to match container first
                if (containerRef.current) {
                  const rect = containerRef.current.getBoundingClientRect();
                  console.log(
                    `[CandlestickChart] Resizing chart after setData: ${rect.width}x${rect.height}`
                  );
                  chartRef.current.applyOptions({
                    width: rect.width,
                    height: rect.height,
                  });
                }

                // CRITICAL: Ensure right price scale is auto-scaling
                const priceScale = chartRef.current.priceScale("right");
                priceScale.applyOptions({
                  autoScale: true,
                  scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                  },
                });

                // CRITICAL: fitContent is the most reliable way to show all data
                const timeScale = chartRef.current.timeScale();
                console.log(
                  `[CandlestickChart] Fitting content to show all ${sortedBars.length} bars...`
                );
                timeScale.fitContent();

                // Force a repaint
                chartRef.current.applyOptions({
                  layout: {
                    ...chartRef.current.options().layout,
                  },
                });

                console.log(`[CandlestickChart] ✅ Chart fitted to content`);
              } catch (err) {
                console.error(`[CandlestickChart] ❌ Error fitting content:`, err);
              }
            });
          } catch (error) {
            console.error(`[CandlestickChart] ❌ Error setting data:`, error);
            console.error(`[CandlestickChart] First bar:`, sortedBars[0]);
            console.error(`[CandlestickChart] Error details:`, error);
            return;
          }

          // 2. Subscribe to real-time updates via SSE
          console.log(`[CandlestickChart] Subscribing to real-time updates for ${symbol}`);

          // Close existing SSE connection if any
          if (eventSourceRef.current) {
            console.log(`[CandlestickChart] Closing existing SSE connection...`);
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }

          eventSourceRef.current = new EventSource(
            `/api/market/stream?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`
          );

          eventSourceRef.current.onmessage = (event) => {
            if (!isSubscribedRef.current) {
              console.warn("[CandlestickChart] ⚠️ Component unsubscribed, ignoring SSE message");
              return;
            }

            if (!seriesRef.current) {
              console.warn("[CandlestickChart] ⚠️ Series is null, ignoring SSE message");
              return;
            }

            try {
              const data = JSON.parse(event.data);

              // Skip connection messages
              if (data.type === "connected") {
                console.log(`[CandlestickChart] SSE connected for ${data.symbol || symbol}`);
                return;
              }

              // Validate candle format
              if (!data || typeof data.time !== "number") {
                console.warn("[CandlestickChart] Invalid candle data from SSE:", data);
                return;
              }

              // CRITICAL: Validate time is in seconds
              if (data.time > 10000000000) {
                console.error(
                  "[CandlestickChart] ❌ SSE candle time is in milliseconds!",
                  data.time
                );
                return;
              }

              // Validate prices
              if (
                typeof data.open !== "number" ||
                typeof data.high !== "number" ||
                typeof data.low !== "number" ||
                typeof data.close !== "number"
              ) {
                console.warn("[CandlestickChart] Invalid candle prices from SSE:", data);
                return;
              }

              if (
                !isFinite(data.open) ||
                !isFinite(data.high) ||
                !isFinite(data.low) ||
                !isFinite(data.close)
              ) {
                console.warn("[CandlestickChart] Non-finite candle prices from SSE:", data);
                return;
              }

              // CRITICAL: Use update() for real-time candles (not setData)
              seriesRef.current.update(data);

              console.log(`[CandlestickChart] ✅ Updated candle from SSE:`, {
                time: data.time,
                timeDate: new Date(data.time * 1000).toISOString(),
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close,
              });
            } catch (error) {
              console.error("[CandlestickChart] ❌ Failed to parse SSE data:", error, event.data);
            }
          };

          eventSourceRef.current.onerror = (error) => {
            console.warn(
              "[CandlestickChart] ⚠️ SSE connection closed (normal if no real-time data)"
            );
            // Don't log error - it's expected when there's no streaming data
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
          };
        } catch (error) {
          console.error("[CandlestickChart] Failed to load data:", error);
          setDataError("Failed to load data");
        }
      };

      // Call loadAndSubscribe after chart is ready
      loadAndSubscribe();
    };

    // Start the retry logic with error handling
    tryLoadData().catch((error) => {
      console.error("[CandlestickChart] ❌ Error in tryLoadData:", error);
      setDataError("Failed to initialize data loading");
    });

    return () => {
      console.log(`[CandlestickChart] 🧹 Cleanup: symbol=${symbol}, timeframe=${timeframe}`);

      // Mark as unsubscribed to prevent async operations from completing
      isSubscribedRef.current = false;

      // Close SSE connection
      if (eventSourceRef.current) {
        console.log(`[CandlestickChart] Closing SSE connection for ${symbol}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // CRITICAL: DO NOT clear series data here - it will be cleared in the next load
      // Clearing here causes race conditions where new data loads before old data is cleared
      // The new load will clear the data before setting new data

      // Reset state
      setHasData(false);
      setDataError(null);
    };
  }, [symbol, timeframe]); // CRITICAL: Don't depend on isChartReady to prevent infinite loops

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        position: "relative",
        backgroundColor: "#0f0f0f", // Match chart background
      }}
    >
      {/* No data overlay */}
      {!hasData && isChartReady && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "#d1d4dc",
            fontSize: "14px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          {dataError ? (
            <div>
              <div style={{ marginBottom: "8px" }}>⚠️ {dataError}</div>
              <div style={{ fontSize: "12px", color: "#758696" }}>Check API logs for details</div>
            </div>
          ) : (
            <div>Loading chart data...</div>
          )}
        </div>
      )}
    </div>
  );
}
