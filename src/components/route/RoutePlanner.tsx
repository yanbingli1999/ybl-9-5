import { Truck, MapPin, Clock, Coins, AlertTriangle, Anchor, Wind, Waves, Calendar, ArrowRight, Pause, Ship, Navigation } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { calculateRouteTime, calculateLoad, calculateTripCost } from '../../utils/routeCalc';
import { analyzeRouteWind, getWindConditionSummary, getWindDirectionName, getTideName, getTideIcon, getMonsoonName, getWindStrengthName } from '../../utils/windCalc';
import CommissionCard from '../port/CommissionCard';
import { useMemo, useState } from 'react';

const RoutePlanner = () => {
  const {
    commissions,
    vehicles,
    routes,
    cities,
    goodsList,
    currentWeather,
    currentWind,
    player,
    selectedCommissions,
    selectedVehicle,
    selectedRoute,
    selectVehicle,
    selectRoute,
    startTrip,
    waitForWind,
    isDispatching,
    isWaitingForWind,
    error,
  } = useGameStore();
  
  const [destinationId, setDestinationId] = useState<string>('');
  
  const acceptedCommissions = commissions.filter(c => c.isAccepted && !c.isShipped && !c.isCompleted);
  
  const availableVehicles = vehicles.filter(v => v.isAvailable);
  
  const availableRoutes = useMemo(() => {
    if (!destinationId) return [];
    return routes.filter(
      r => 
        (r.fromCityId === 'yuegang' && r.toCityId === destinationId) ||
        (r.fromCityId === destinationId && r.toCityId === 'yuegang')
    );
  }, [routes, destinationId]);
  
  const selectedCommissionsData = selectedCommissions.map(id => 
    commissions.find(c => c.id === id)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));
  
  const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle);
  const selectedRouteData = routes.find(r => r.id === selectedRoute);
  const destination = cities.find(c => c.id === destinationId);
  
  const currentRouteWindAnalysis = useMemo(() => {
    if (!selectedRouteData || !currentWind) return null;
    return analyzeRouteWind(selectedRouteData, currentWind, cities, 'yuegang');
  }, [selectedRouteData, currentWind, cities]);
  
  const routeCalculation = useMemo(() => {
    if (!selectedRouteData || !selectedVehicleData || !currentWeather) return null;
    return calculateRouteTime(selectedRouteData, selectedVehicleData, currentWeather, currentRouteWindAnalysis || undefined);
  }, [selectedRouteData, selectedVehicleData, currentWeather, currentRouteWindAnalysis]);
  
  const loadCalculation = useMemo(() => {
    if (!selectedVehicleData || selectedCommissionsData.length === 0) return null;
    return calculateLoad(
      selectedVehicleData,
      selectedCommissionsData,
      goodsList
    );
  }, [selectedVehicleData, selectedCommissionsData, goodsList]);
  
  const tripCost = useMemo(() => {
    if (!selectedRouteData || !selectedVehicleData || !routeCalculation) return 0;
    return calculateTripCost(selectedRouteData, selectedVehicleData, routeCalculation.totalTime);
  }, [selectedRouteData, selectedVehicleData, routeCalculation]);
  
  const hasLandAlternative = useMemo(() => {
    if (!destinationId) return false;
    return availableRoutes.some(r => r.type === 'land');
  }, [destinationId, availableRoutes]);
  
  const handleStartTrip = async () => {
    const success = await startTrip();
    if (success) {
      setDestinationId('');
    }
  };
  
  const handleWaitForWind = async () => {
    if (!currentRouteWindAnalysis || currentRouteWindAnalysis.waitHours <= 0) return;
    await waitForWind(currentRouteWindAnalysis.waitHours);
  };

  const getAlignmentBadgeStyle = (alignment: string) => {
    switch (alignment) {
      case 'tailwind':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'headwind':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'crosswind':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getAlignmentIcon = (alignment: string) => {
    switch (alignment) {
      case 'tailwind': return '⛵';
      case 'headwind': return '🌀';
      case 'crosswind': return '↔️';
      default: return '🌊';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">路线规划</h2>
            <p className="text-slate-500">选择货物、车辆和路线，安排运输任务</p>
          </div>
          {currentWind && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
              <Anchor className="w-5 h-5 text-sky-600" />
              <div className="text-sm">
                <div className="font-medium text-sky-800">{getWindConditionSummary(currentWind)}</div>
                <div className="text-xs text-sky-600">第 {currentWind.updatedDay} 天 · {
                  currentWind.updatedTimeOfDay === 'morning' ? '清晨' :
                  currentWind.updatedTimeOfDay === 'afternoon' ? '午后' :
                  currentWind.updatedTimeOfDay === 'evening' ? '傍晚' : '夜晚'
                }</div>
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                待运货物 ({acceptedCommissions.length})
              </h3>
              
              {acceptedCommissions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  暂无待运货物，请先在港口大厅接单
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {acceptedCommissions.map(commission => (
                    <CommissionCard
                      key={commission.id}
                      commission={commission}
                      showAccept={false}
                      showSelect={true}
                      isSelected={selectedCommissions.includes(commission.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {selectedCommissionsData.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  选择目的地
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cities.filter(c => c.id !== 'yuegang').map(city => (
                    <button
                      key={city.id}
                      onClick={() => {
                        setDestinationId(city.id);
                        selectRoute('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        destinationId === city.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-medium text-slate-800">{city.name}</div>
                      <div className="text-xs text-slate-500 capitalize">
                        {city.type === 'port' ? '港口' : 
                         city.type === 'capital' ? '都城' :
                         city.type === 'overseas' ? '海外' : '城市'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {destinationId && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-slate-800 mb-4">
                  可选路线 - {destination?.name}
                </h3>
                
                {availableRoutes.length === 0 ? (
                  <div className="text-center py-4 text-slate-500">
                    暂无直达路线，请选择其他目的地
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableRoutes.map(route => {
                      const routeType = route.type === 'land' ? '陆路' : '水路';
                      const routeTypeColor = route.type === 'land' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';
                      const windAnalysis = currentWind 
                        ? analyzeRouteWind(route, currentWind, cities, 'yuegang')
                        : null;
                      
                      return (
                        <button
                          key={route.id}
                          onClick={() => selectRoute(route.id)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                            selectedRoute === route.id
                              ? 'border-amber-500 bg-amber-50 shadow-md'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${routeTypeColor}`}>
                                {route.type === 'water' ? <Ship className="w-3 h-3 inline mr-1" /> : null}
                                {routeType}
                              </span>
                              {windAnalysis && windAnalysis.isWaterRoute && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 ${getAlignmentBadgeStyle(windAnalysis.alignment)}`}>
                                  <span>{getAlignmentIcon(windAnalysis.alignment)}</span>
                                  {windAnalysis.alignmentLabel}
                                </span>
                              )}
                              <span className="font-medium text-slate-800">{route.distance} 里</span>
                            </div>
                            <span className="text-sm text-slate-600">
                              基础费用: {route.baseCost} 金币
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              约 {route.baseTimeHours} 小时
                            </span>
                            {route.type === 'land' ? (
                              <span>驿站停靠: {route.stops} 次</span>
                            ) : (
                              <span>中途停靠: {route.stops} 个港口</span>
                            )}
                            <span>路况: {Math.round(route.condition * 100)}%</span>
                          </div>
                          {windAnalysis && windAnalysis.isWaterRoute && (
                            <div className={`mt-3 p-3 rounded-lg text-sm ${
                              windAnalysis.recommended 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                : 'bg-red-50 text-red-800 border border-red-100'
                            }`}>
                              <div className="flex items-start gap-2">
                                {windAnalysis.recommended 
                                  ? <Navigation className="w-4 h-4 mt-0.5 text-emerald-600" />
                                  : <AlertTriangle className="w-4 h-4 mt-0.5 text-red-600" />}
                                <div className="flex-1">
                                  <div className="font-medium">{windAnalysis.description}</div>
                                  <div className="text-xs mt-1 opacity-80 flex flex-wrap gap-x-4 gap-y-1">
                                    <span>时间影响: ×{windAnalysis.timeModifier.toFixed(2)}</span>
                                    <span>货损影响: ×{windAnalysis.damageModifier.toFixed(2)}</span>
                                    <span>海盗概率: ×{windAnalysis.pirateModifier.toFixed(2)}</span>
                                    <span>潮汐影响: ×{windAnalysis.tideModifier.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-semibold text-slate-800 mb-4">选择车辆</h3>
              
              {availableVehicles.length === 0 ? (
                <div className="text-center py-4 text-slate-500">
                  暂无可用车辆
                </div>
              ) : (
                <div className="space-y-3">
                  {availableVehicles.map(vehicle => {
                    const vehicleType = vehicle.type === 'land' ? '陆路' : '水路';
                    const isCompatible = !selectedRouteData || 
                      (selectedRouteData.type === vehicle.type);
                    
                    return (
                      <button
                        key={vehicle.id}
                        onClick={() => selectVehicle(vehicle.id)}
                        disabled={!isCompatible}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedVehicle === vehicle.id
                            ? 'border-amber-500 bg-amber-50'
                            : isCompatible
                            ? 'border-slate-200 hover:border-slate-300'
                            : 'border-slate-100 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{vehicle.icon}</span>
                          <div>
                            <div className="font-medium text-slate-800">{vehicle.name}</div>
                            <div className="text-xs text-slate-500">{vehicleType}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                          <div>
                            <div className="text-slate-400">载重</div>
                            <div className="font-medium">{vehicle.capacity}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">速度</div>
                            <div className="font-medium">{vehicle.speed}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">时薪</div>
                            <div className="font-medium">{vehicle.costPerHour}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            {currentRouteWindAnalysis && currentRouteWindAnalysis.isWaterRoute && (
              <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 rounded-xl shadow-md p-5 border border-sky-100">
                <h3 className="font-semibold text-sky-900 mb-4 flex items-center gap-2">
                  <Wind className="w-5 h-5 text-sky-600" />
                  风候评估
                </h3>
                
                <div className="space-y-3">
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${getAlignmentBadgeStyle(currentRouteWindAnalysis.alignment)}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getAlignmentIcon(currentRouteWindAnalysis.alignment)}</span>
                      <div>
                        <div className="font-medium">{currentRouteWindAnalysis.alignmentLabel}</div>
                        <div className="text-xs opacity-80">当前 {destination?.name} 方向的风况</div>
                      </div>
                    </div>
                  </div>
                  
                  {currentWind && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-white rounded-lg p-2 text-center border border-sky-100">
                        <div className="text-sky-400 mb-0.5"><Wind className="w-3 h-3 mx-auto" /></div>
                        <div className="font-medium text-sky-900">{getWindStrengthName(currentWind.strength)}</div>
                        <div className="text-sky-600">{getWindDirectionName(currentWind.direction)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-sky-100">
                        <div className="text-sky-400 mb-0.5"><Waves className="w-3 h-3 mx-auto" /></div>
                        <div className="font-medium text-sky-900">{getTideIcon(currentWind.tide)}{getTideName(currentWind.tide)}</div>
                        <div className="text-sky-600">倍率 ×{currentRouteWindAnalysis.tideModifier.toFixed(2)}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-sky-100">
                        <div className="text-sky-400 mb-0.5"><Calendar className="w-3 h-3 mx-auto" /></div>
                        <div className="font-medium text-sky-900 text-[10px] leading-tight">{getMonsoonName(currentWind.monsoonSeason)}</div>
                        <div className="text-sky-600">时令</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-sm p-3 bg-white rounded-lg border border-sky-100 text-slate-700 leading-relaxed">
                    {currentRouteWindAnalysis.description}
                  </div>
                </div>
              </div>
            )}
            
            {selectedCommissionsData.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-5">
                <h3 className="font-semibold text-slate-800 mb-4">运输预览</h3>
                
                <div className="space-y-4">
                  {loadCalculation && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">载重</span>
                        <span className={`font-medium ${
                          loadCalculation.isOverloaded ? 'text-red-500' : 'text-slate-800'
                        }`}>
                          {loadCalculation.currentLoad} / {loadCalculation.vehicleCapacity}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            loadCalculation.isOverloaded ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, 
                              (loadCalculation.currentLoad / loadCalculation.vehicleCapacity) * 100
                            )}%` 
                          }}
                        />
                      </div>
                      {loadCalculation.isOverloaded && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          超载！罚款 {loadCalculation.overloadPenalty} 金币
                        </p>
                      )}
                    </div>
                  )}
                  
                  {routeCalculation && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">预计耗时</span>
                        <span className="font-medium text-slate-800">
                          {routeCalculation.totalTime} 小时
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">驿站/港口停靠</span>
                        <span className="font-medium text-slate-800">
                          {routeCalculation.stops} 次 ({routeCalculation.stopTime}小时)
                        </span>
                      </div>
                      {currentWeather && currentWeather.speedModifier > 1 && (
                        <div className="flex justify-between text-amber-600">
                          <span className="flex items-center gap-1">
                            {currentWeather.icon} 天气影响
                          </span>
                          <span>×{currentWeather.speedModifier}</span>
                        </div>
                      )}
                      {routeCalculation.windAlignment && routeCalculation.windTimeModifier !== 1.0 && (
                        <div className={`flex justify-between ${
                          routeCalculation.windTimeModifier < 1 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          <span className="flex items-center gap-1">
                            {getAlignmentIcon(routeCalculation.windAlignment)} {routeCalculation.windAlignmentLabel}
                          </span>
                          <span>×{routeCalculation.windTimeModifier.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-slate-600">运输费用</span>
                      <span className="font-bold text-lg text-amber-600 flex items-center gap-1">
                        <Coins className="w-5 h-5" />
                        {tripCost.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-slate-600">预计收入</span>
                      <span className="font-bold text-green-600">
                        {selectedCommissionsData.reduce((sum, c) => sum + (c?.reward || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-700">预计利润</span>
                      <span className={`text-lg ${
                        selectedCommissionsData.reduce((sum, c) => sum + (c?.reward || 0), 0) - tripCost >= 0
                          ? 'text-green-600'
                          : 'text-red-500'
                      }`}>
                        {selectedCommissionsData.reduce((sum, c) => sum + (c?.reward || 0), 0) - tripCost >= 0 ? '+' : ''}
                        {(selectedCommissionsData.reduce((sum, c) => sum + (c?.reward || 0), 0) - tripCost).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {currentRouteWindAnalysis && currentRouteWindAnalysis.isWaterRoute && !currentRouteWindAnalysis.recommended && currentRouteWindAnalysis.waitHours > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <button
                        onClick={handleWaitForWind}
                        disabled={isWaitingForWind || isDispatching}
                        className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white font-medium rounded-lg hover:from-sky-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                      >
                        <Pause className="w-4 h-4" />
                        {isWaitingForWind ? '候风中...' : `等待约 ${currentRouteWindAnalysis.waitHours} 小时候顺风`}
                      </button>
                      <p className="text-xs text-slate-500 text-center">
                        等待消耗交货期限，但可能换来更稳收益
                      </p>
                      {hasLandAlternative && (
                        <p className="text-xs text-amber-600 text-center flex items-center justify-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          或改走更稳的陆路
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="pt-2 space-y-2">
                    {currentRouteWindAnalysis && currentRouteWindAnalysis.isWaterRoute && !currentRouteWindAnalysis.recommended && (
                      <div className="p-2 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>逆风出发风险较大，建议候风或改走陆路</span>
                      </div>
                    )}
                    <button
                      onClick={handleStartTrip}
                      disabled={
                        selectedCommissions.length === 0 ||
                        !selectedVehicle ||
                        !selectedRoute ||
                        player.gold < tripCost ||
                        (loadCalculation?.isOverloaded || false) ||
                        isDispatching ||
                        isWaitingForWind
                      }
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isDispatching ? '派车中...' : 
                       currentRouteWindAnalysis?.isWaterRoute && !currentRouteWindAnalysis.recommended
                        ? '冒险出发（逆风）'
                        : '确认派车'
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;
