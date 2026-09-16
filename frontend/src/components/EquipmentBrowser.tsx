import React, { useState } from 'react';
import { PhysicalAsset, AssetCategory, AssetStatus } from '../types';
import { Search, Camera, Filter, CheckCircle2, AlertTriangle, Lock, DollarSign, Barcode, Hash } from 'lucide-react';

interface EquipmentBrowserProps {
  assets: PhysicalAsset[];
  categories: AssetCategory[];
  onSelectForBooking: (asset: PhysicalAsset) => void;
}

export const EquipmentBrowser: React.FC<EquipmentBrowserProps> = ({
  assets,
  categories,
  onSelectForBooking,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || asset.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.AVAILABLE:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 badge-glow-emerald">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>AVAILABLE</span>
          </span>
        );
      case AssetStatus.RESERVED:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 badge-glow-amber">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>RESERVED</span>
          </span>
        );
      case AssetStatus.CHECKED_OUT:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 badge-glow-sky">
            <Lock className="w-3.5 h-3.5" />
            <span>CHECKED OUT</span>
          </span>
        );
      case AssetStatus.IN_MAINTENANCE:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 badge-glow-rose">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>MAINTENANCE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-sky-950/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Camera className="w-7 h-7 text-sky-400" />
              <span>AV Equipment & Serialization Catalog</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Browse physical inventory units with unique Barcodes, Serial Numbers, and Category lending rules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Total Units</div>
              <div className="text-xl font-bold text-sky-400">{assets.length}</div>
            </div>
            <div className="px-4 py-2 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400">Available</div>
              <div className="text-xl font-bold text-emerald-400">
                {assets.filter((a) => a.status === AssetStatus.AVAILABLE).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search model, barcode, serial..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            All Categories ({assets.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.name} ({assets.filter((a) => a.categoryId === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map((asset) => (
          <div key={asset.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              {/* Header: Category & Status */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-md border border-sky-800/40">
                  {asset.category.name}
                </span>
                {getStatusBadge(asset.status)}
              </div>

              {/* Model Title */}
              <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                {asset.model}
              </h3>

              {/* Identifiers: Barcode & Serial */}
              <div className="mt-4 space-y-2 text-xs font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" />
                    <span>Barcode:</span>
                  </span>
                  <span className="font-semibold text-sky-300">{asset.barcode}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    <span>Serial No:</span>
                  </span>
                  <span className="font-semibold text-slate-200">{asset.serialNumber}</span>
                </div>
              </div>

              {/* Category Rules & Fees */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Required Deposit</span>
                  <div className="font-bold text-emerald-400 flex items-center">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{asset.category.depositRequired.toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Max Category Limit</span>
                  <div className="font-bold text-slate-200">
                    {asset.category.maxBorrowLimit} {asset.category.maxBorrowLimit === 1 ? 'unit' : 'units'}
                  </div>
                </div>

                <div className="col-span-2 mt-1">
                  <span className="text-slate-400">Late Fee Rate:</span>{' '}
                  <span className="text-amber-300 font-semibold">
                    ${asset.category.lateFeePerDay.toFixed(2)}/day
                  </span>{' '}
                  <span className="text-[10px] text-slate-500">(Mon-Fri 8am-6pm)</span>
                </div>
              </div>

              {asset.conditionNotes && (
                <p className="mt-3 text-xs text-slate-400 italic bg-slate-900/40 p-2 rounded-lg border border-slate-800/40">
                  "{asset.conditionNotes}"
                </p>
              )}
            </div>

            {/* Action */}
            <button
              onClick={() => onSelectForBooking(asset)}
              disabled={asset.status === AssetStatus.IN_MAINTENANCE || asset.status === AssetStatus.LOST}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                asset.status === AssetStatus.AVAILABLE
                  ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20'
                  : asset.status === AssetStatus.RESERVED
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>
                {asset.status === AssetStatus.IN_MAINTENANCE
                  ? 'Maintenance Block'
                  : asset.status === AssetStatus.CHECKED_OUT
                  ? 'Currently Checked Out'
                  : 'Reserve This Unit'}
              </span>
            </button>
          </div>
        ))}

        {filteredAssets.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 glass-panel rounded-2xl">
            <Camera className="w-12 h-12 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-semibold">No equipment matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

function ClockIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path strokeLinecap="round" strokeWidth="2" d="M12 6v6l4 2" />
    </svg>
  );
}
