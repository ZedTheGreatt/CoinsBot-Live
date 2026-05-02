import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, LineData, SeriesMarker, LineStyle, CandlestickSeries, HistogramSeries, LineSeries, MouseEventParams } from 'lightweight-charts';
import { OHLCCandle, MarketSignal } from '../types';
import { calculateEMA, generateSignals } from '../lib/engine';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, TrendingUp, TrendingDown, Info, Target, ShieldAlert, Clock } from 'lucide-react';
import { cn, formatInPHT } from '../lib/utils';

interface TradingChartProps {
  data: OHLCCandle[];
  symbol: string;
}

export default function TradingChart({ data, symbol }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lastSymbolRef = useRef<string>('');
  
  const [hoveredSignal, setHoveredSignal] = useState<MarketSignal | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const signalsRef = useRef<MarketSignal[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1E2329' },
        horzLines: { color: '#1E2329' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderColor: '#1E2329',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: number) => {
          return formatInPHT(time * 1000, { showDate: false });
        },
      },
      localization: {
        timeFormatter: (time: number) => {
          return formatInPHT(time * 1000, { showDate: true, showSeconds: true });
        },
      },
      rightPriceScale: {
        borderColor: '#1E2329',
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#4b5563',
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: '#111827',
        },
        horzLine: {
          color: '#4b5563',
          width: 1,
          style: LineStyle.LargeDashed,
          labelBackgroundColor: '#111827',
        },
      },
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(chartContainerRef.current);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#1E2329',
      priceFormat: { type: 'volume' },
      priceScaleId: '', 
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const ema50Series = chart.addSeries(LineSeries, {
      color: '#60A5FA',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema200Series = chart.addSeries(LineSeries, {
      color: '#FACC15',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.point || !param.time || !chartContainerRef.current) {
        setHoveredSignal(null);
        return;
      }

      const time = param.time as number;
      // Check if there's a signal at this time +/- a small buffer if needed, 
      // but markers are usually exact time.
      const signal = signalsRef.current.find(s => s.time === time);

      if (signal) {
        // Position tooltip near the point
        const containerRect = chartContainerRef.current.getBoundingClientRect();
        // Adjust for floating panel if needed, but relative to this container is usually best
        setTooltipPos({ 
          x: param.point.x, 
          y: param.point.y 
        });
        setHoveredSignal(signal);
      } else {
        setHoveredSignal(null);
      }
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ema50SeriesRef.current = ema50Series;
    ema200SeriesRef.current = ema200Series;
    chartRef.current = chart;

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !data.length) return;

    const candleData: CandlestickData[] = data.map(d => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = data.map(d => ({
      time: d.time as any,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    const closes = data.map(d => d.close);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);

    const ema50Data: LineData[] = data.map((d, i) => ({
      time: d.time as any,
      value: ema50[i],
    })).slice(50);

    const ema200Data: LineData[] = data.map((d, i) => ({
      time: d.time as any,
      value: ema200[i],
    })).slice(200);

    ema50SeriesRef.current?.setData(ema50Data);
    ema200SeriesRef.current?.setData(ema200Data);

    // Apply signals
    const signals = generateSignals(data);
    signalsRef.current = signals;

    const markers: SeriesMarker<any>[] = signals.map((s, idx) => {
      const isStrong = s.type.startsWith('STRONG');
      const isBuy = s.type.includes('BUY');
      const isLatest = idx === signals.length - 1;
      
      return {
        time: s.time as any,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#10b981' : '#ef4444',
        shape: isBuy ? 'arrowUp' : 'arrowDown',
        text: isStrong ? '★' : '', // Subtle star for strong signals
        size: isStrong ? 2 : 1,
      };
    });

    if (candleSeriesRef.current && (candleSeriesRef.current as any).setMarkers) {
      (candleSeriesRef.current as any).setMarkers(markers);
    }
    
    // Auto-fit only on first load or when switching symbols
    if (data.length > 0 && lastSymbolRef.current !== symbol) {
      chartRef.current?.timeScale().fitContent();
      lastSymbolRef.current = symbol;
    }

  }, [data, symbol]);

  return (
    <div className="relative w-full h-full min-h-[400px] bg-brand-bg rounded-xl overflow-hidden group">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Signal Tooltip */}
      <AnimatePresence>
        {hoveredSignal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute z-[100] pointer-events-none"
            style={{ 
              left: tooltipPos.x + 20, 
              top: tooltipPos.y - 120, // Offset to appear above the cursor
            }}
          >
            <div className="bg-brand-bg/95 backdrop-blur-md border border-brand-border p-4 rounded-xl shadow-2xl min-w-[200px] ring-1 ring-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    hoveredSignal.type.includes('BUY') ? "bg-brand-green shadow-[0_0_8px_#10b981]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                  )} />
                  <span className={cn(
                    "text-xs font-black uppercase italic tracking-tighter",
                    hoveredSignal.type.includes('BUY') ? "text-brand-green" : "text-red-500"
                  )}>
                    {hoveredSignal.type.replace('_', ' ')}
                  </span>
                </div>
                <div className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400">
                    {hoveredSignal.confidence}% Conf.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Zap className="w-3 h-3" />
                    <span>Entry Price</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {hoveredSignal.price.toLocaleString()} PHP
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Target className="w-3 h-3 text-brand-green" />
                    <span>Take Profit</span>
                  </div>
                  <span className="font-mono font-bold text-brand-green">
                    {hoveredSignal.tp.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ShieldAlert className="w-3 h-3 text-red-400" />
                    <span>Stop Loss</span>
                  </div>
                  <span className="font-mono font-bold text-red-400">
                    {hoveredSignal.sl.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-brand-border flex items-center justify-between text-[9px] text-gray-500 font-medium">
                   <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatInPHT(hoveredSignal.time * 1000, { showSeconds: true })}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      {hoveredSignal.trend === 'BULLISH' ? <TrendingUp className="w-2.5 h-2.5 text-brand-green" /> : <TrendingDown className="w-2.5 h-2.5 text-red-500" />}
                      <span className="uppercase">{hoveredSignal.trend}</span>
                   </div>
                </div>
              </div>

              {/* Decorative Arrow */}
              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-bg border-l border-b border-brand-border rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark/Logo Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-20">
         <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-green rounded flex items-center justify-center">
               <Zap className="w-4 h-4 text-black fill-current" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">GainzAlgo <span className="text-brand-green">Engine</span></span>
         </div>
      </div>
    </div>
  );
}
