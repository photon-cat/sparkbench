// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.NetworkInformation;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;


namespace SimBase
{
    /// <summary>
    /// A net class for connecting pins.
    /// </summary>
    public class Net
    {

        /// <summary>Voltage definition for TTL VCC</summary>
        private const float VCC = 5;
        /// <summary>Maximum voltage definition for TTL low level.</summary>
        private const float VL = 1.0f;
        /// <summary>Minimum voltage definition for TTL high level.</summary>
        private const float VH = 3.5f;
        /// <summary>Low level threshold ratio.</summary>
        private const float L_THR = VL / VCC;
        /// <summary>High level threshold ratio.</summary>
        private const float H_THR = VH / VCC;
        /// <summary>Typical transistor on resistance in TTL.</summary>
        private const float R_ON = 10;
        /// <summary>Typical transistor off resistance in TTL.</summary>
        private const float R_OFF = 10e6f;
        /// <summary>Typical high impedance resistance.</summary>
        private const float R_Z_THR = R_OFF;

        /// <summary>Name of the net.</summary>
        public string Name;
        /// <summary>List of connected pins.</summary>
        public readonly PinList ConnectedPins;
        /// <summary>SignalState if connected to a constant source.</summary>
        private SignalState constState;
        /// <summary>Current SignalState of this net.</summary>
        private SignalState currentState;
        /// <summary>Current time value.</summary>
        private double currentTime;

        /// <summary>Number of connected outputs currently pulling Low.</summary>
        private int countL;
        /// <summary>Number of connected outputs currently pulling High.</summary>
        private int countH;
        /// <summary>Number of connected outputs currently in high impedance.</summary>
        private int countZ;
        /// <summary>Number of connected outputs currently in undefined state.</summary>
        private int countU;


        /// <summary>
        /// Enumeration of possible optimized modes.
        /// </summary>
        private enum OptMode
        {
            Init,
            Const,
            Direct,
            Digital,
            Analog
        }

        /// <summary>Optimized mode.</summary>
        private OptMode optMode;
        /// <summary>Output pin for a direct connection or a pull-up/pull-down.</summary>
        private Pin connectedOutput;
        /// <summary>List of all connected output pins</summary>
        private List<Pin> outputs;
        /// <summary>List of all connected passive pins</summary>
        private List<Pin> passives;
        //private Resistor pullUp;
        //private Resistor pullDown;

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        public Net() : this(GetNetName(), new Pin[] { }) { }

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        /// <param name="ConnectedPin">Pin object connected to this net.</param>
        public Net(Pin ConnectedPin) : this(GetNetName(), new Pin[] { ConnectedPin }) { }

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        /// <param name="ConnectedPins">Array of connected pins.</param>
        public Net(Pin[] ConnectedPins):this(GetNetName(), ConnectedPins) { }

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        /// <param name="Name">Name of the net.</param>
        public Net(string Name) : this(Name, new Pin[] { }) { }

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        /// <param name="Name">Name of the net.</param>
        /// <param name="ConnectedPin">Pin object connected to this net.</param>
        public Net(string Name, Pin ConnectedPin) : this(Name, new Pin[] {ConnectedPin}) { }

        /// <summary>
        /// Creates the instance of Net.
        /// </summary>
        /// <param name="Name">Name of the net.</param>
        /// <param name="ConnectedPins">Array of connected pins.</param>
        public Net(string Name, Pin[] ConnectedPins)
        {
            this.Name = Name;
            this.ConnectedPins = new PinList(this);
            if (ConnectedPins != null ) 
                this.ConnectedPins.AddRange(ConnectedPins);

            optMode = OptMode.Init;
            constState = SignalState.U;
            currentState = SignalState.U;
            currentTime = 0;
        }

        /// <summary>A net identifier counter for un-named nets.</summary>
        private static int netID = 0;

        /// <summary>
        /// Get a unique net name by counting up with each call.
        /// </summary>
        /// <returns></returns>
        private static string GetNetName()
        {
            return "Net_"+(netID++).ToString();
        }

        /// <summary>
        /// Calculate a signal level.
        /// </summary>
        /// <param name="SignalLevel">Signal value level.</param>
        /// <param name="Rsum">Resulting resistance.</param>
        private void CalcSignalLevel(out float SignalLevel, out float Rsum)
        {
            float h = float.MinValue;
            float l = float.MinValue;
            foreach(Pin p in ConnectedPins)
            {
                if (p.Mode != LineMode.In)
                {
                    if (p.State == SignalState.L)
                    {
                        l += 1 / R_ON;
                        //h += 1 / R_OFF;
                    }
                    else if (p.State == SignalState.H)
                    {
                        //l += 1 / R_OFF;
                        h += 1 / R_ON;
                    }
                }
                else if (p.Mode == LineMode.Passive)
                {
                    if (p.Owner is Resistor)
                    {
                        Resistor r = ((Resistor)p.Owner);
                        SignalState pullstate = r.OtherPin(p).State;
                        if (pullstate == SignalState.L)
                        {
                            l += 1 / (float)r.Value;
                        }
                        else if (pullstate == SignalState.H)
                        {
                            h += 1 / (float)r.Value;
                        }
                    }
                    else if (p.Owner is ResistorNetwork)
                    {
                        ResistorNetwork rn = ((ResistorNetwork)p.Owner);
                        if (rn.CommonPin)
                        {
                            SignalState pullstate = rn.Passive[0].State;

                            if (pullstate == SignalState.L)
                            {
                                l += 1 / (float)rn.Value;
                            }
                            else if (pullstate == SignalState.H)
                            {
                                h += 1 / (float)rn.Value;
                            }
                        }
                    }

                }
            }
            SignalLevel =  1 / (1+l/h);
            Rsum = 1 / l + 1 / h;
        }

        /// <summary>
        /// Calculate a SignalState from an analog calculation.
        /// </summary>
        /// <returns>Resulting SignalState.</returns>
        private SignalState GetStateAnalog()
        {
            float signal, rsum;
            CalcSignalLevel(out signal, out rsum);
            if (rsum >= R_Z_THR)
                return SignalState.Z;
            else if (signal <= L_THR)
                return SignalState.L;
            else if (signal >= H_THR)
                return SignalState.L;
            else
                return SignalState.U;
        }

        /// <summary>
        /// Check on pull-up/pull-down resistors or resistor networks
        /// </summary>
        /// <param name="Pin">Pin to be checked.</param>
        /// <returns>Determined SignalState</returns>
        private SignalState GetResState(Pin Pin)
        {
            if (Pin.Owner is Resistor)
            {
                Resistor r = Pin.Owner as Resistor;
                Pin p = r.OtherPin(Pin);
                if (p.State == SignalState.Z)
                    return p.ConnectedNet.GetState(currentTime-1);
                return p.State;
            }
            else if (Pin.Owner is ResistorNetwork)
            {
                ResistorNetwork rn = Pin.Owner as ResistorNetwork;
                if (rn.CommonPin)
                {
                    if (rn.Passive[0].State == SignalState.Z)
                        return rn.Passive[0].ConnectedNet.GetState(currentTime - 1);
                    return rn.Passive[0].State;
                }
            }
            return SignalState.Z;
        }

        /// <summary>
        /// Get the SignalState of connected digital outputs.
        /// </summary>
        /// <returns>Determined SignalState.</returns>
        private SignalState GetStateDigital()
        {
            countL = 0; countH = 0; countZ = 0; countU=0;
            foreach (Pin pin in outputs)
            {
                SignalState state = pin.State;
                if ((pin.Mode == LineMode.BiDir) && (pin.DriverActive == false))
                    state = SignalState.Z;
                else if ((pin.Mode == LineMode.OpenDrain) && ((pin.DriverActive == false) || (pin.State == SignalState.H)))
                    state = SignalState.Z;

                switch (state)
                {
                    case SignalState.L: countL++; break;
                    case SignalState.H: countH++; break;
                    case SignalState.U: countU++; break;
                    case SignalState.Z: countZ++; break;
                }
            }

            if ((countU > 0) || ((countL>0) && (countH>0)))
                return SignalState.U;

            if ((countL > 0) && (countH == 0))
                return SignalState.L;

            if ((countL == 0) && (countH > 0))
                return SignalState.H;

            //if (countZ > 0)
            {
                if (passives.Count == 0)
                    return SignalState.Z;
                else if (passives.Count == 1)
                    return GetResState(passives[0]);
                else
                {
                    SignalState state = SignalState.Z;
                    for (int i = 0; i < passives.Count; i++)
                    {
                        state = GetResState(passives[i]);
                        if (state != SignalState.Z)
                            break;
                    }
                    if (state != SignalState.Z)
                    {
                        for (int i = 0; i < passives.Count; i++)
                        {
                            if (passives[i].Owner is Diode)
                            {
                                Diode diode = (Diode)passives[i].Owner;
                                if (passives[i] == diode.Anode)
                                {
                                    if ((state == SignalState.H)  && (diode.Cathode.State == SignalState.L))
                                        return SignalState.L;
                                }
                                else
                                {
                                    if ((state == SignalState.L)  && (diode.Anode.State == SignalState.H))
                                        return SignalState.H;
                                }
                            }
                        }
                    }
                    return state;
                }
            }
            return SignalState.Z;
        }

        /// <summary>
        /// Initialize the optimization mode by analyzing the connections
        /// </summary>
        private void InitOptMode()
        {
            outputs = new List<Pin>();
            passives = new List<Pin>();

            foreach (Pin pin in ConnectedPins)
                if (pin.Mode != LineMode.In)
                {
                    if (pin.Mode == LineMode.Passive)
                        passives.Add(pin);
                    else
                        outputs.Add(pin);
                }


            if (IsPowerOrLogicHigh(Name))
            {
                optMode = OptMode.Const;
                constState = SignalState.H;
                foreach (Pin pin in ConnectedPins)
                    pin.SetOutState(constState);
            }
            else if (IsGroundOrLogicLow(Name))
            {
                optMode = OptMode.Const;
                constState = SignalState.L;
                foreach (Pin pin in ConnectedPins)
                    pin.SetOutState(constState);
            }
            else
            {
                if (outputs.Count == 0)
                {
                    if (passives.Count == 0)
                        optMode = OptMode.Const;

                    else if (passives.Count > 0)
                    {
                        int rcount = 0;
                        int dcount = 0;
                        for (int i = 0; i < passives.Count; i++)
                        {
                            if (passives[i].Owner is Resistor)
                            {
                                Resistor r = ((Resistor)passives[i].Owner);
                                optMode = OptMode.Direct;
                                connectedOutput = r.OtherPin(passives[i]);
                                rcount++;
                            }
                            else if (passives[i].Owner is ResistorNetwork)
                            {
                                ResistorNetwork rn = ((ResistorNetwork)passives[i].Owner);
                                optMode = OptMode.Direct;
                                if (rn.CommonPin)
                                    connectedOutput = rn.Passive[i];
                                rcount++;
                            }
                            else if (passives[i].Owner is Diode)
                            {
                                dcount++;
                            }
                        }
                        if ((rcount>0) && (dcount>0))
                        {
                            optMode = OptMode.Digital;
                        }
                    }
                    else
                        optMode = OptMode.Analog;
                }
                else if (outputs.Count == 1)
                {
                    if (outputs[0].Mode == LineMode.Out)
                    {
                        optMode = OptMode.Direct;
                        connectedOutput = outputs[0];
                    }
                    else
                        optMode = OptMode.Digital;
                }
                else
                {
                    optMode = OptMode.Digital;
                }
            }
        }

        /// <summary>
        /// Get the SignalState of connected digital outputs excluding the specified pin.
        /// </summary>
        /// <param name="ExcludePin">Pin to exclude from the query.</param>
        /// <returns>State of the net excluding the specified pin</returns>
        public SignalState GetExclusiveState(Pin ExcludePin)
        {
            countL = 0; countH = 0; countZ = 0; countU = 0;
            foreach (Pin pin in outputs)
            {
                if (pin != ExcludePin) 
                {
                    SignalState state = pin.State;
                    if ((pin.Mode == LineMode.BiDir) && (pin.DriverActive == false))
                        state = SignalState.Z;
                    else if ((pin.Mode == LineMode.OpenDrain) && ((pin.DriverActive == false) || (pin.State == SignalState.H)))
                        state = SignalState.Z;

                    switch (state)
                    {
                        case SignalState.L: countL++; break;
                        case SignalState.H: countH++; break;
                        case SignalState.U: countU++; break;
                        case SignalState.Z: countZ++; break;
                    }
                }
            }

            if ((countU > 0) || ((countL > 0) && (countH > 0)))
                return SignalState.U;

            if ((countL > 0) && (countH == 0))
                return SignalState.L;

            if ((countL == 0) && (countH > 0))
                return SignalState.H;
            return SignalState.Z;
        }


        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public void SimulationRestart()
        {
            InitOptMode();
        }

        /// <summary>
        /// Get the SignalState of the net.
        /// </summary>
        /// <param name="Time">Time to check</param>
        /// <returns>SignalState of the net.</returns>
        public SignalState GetState(double Time)
        {
            //if (currentTime == Time)
            //    return currentState;

            currentTime = Time;
            switch (optMode)
            {
                case OptMode.Init:
                    InitOptMode();
                    break;

                case OptMode.Const:
                    currentState = constState;
                    break;

                case OptMode.Direct:
                    currentState = connectedOutput.State;
                    break;

                case OptMode.Digital:
                    currentState = GetStateDigital();
                    break;

                case OptMode.Analog:
                    currentState = GetStateAnalog();
                    break;
            }

            return currentState;
        }



        /// <summary>
        /// Returns true, if the net name contains hints to logivc level high or power.
        /// </summary>
        /// <param name="NetName">Net name to check.</param>
        /// <returns>True, if power or logic high.</returns>
        public static bool IsPowerOrLogicHigh(string NetName)
        {
            return ((NetName == "+5V") || (NetName == "VCC") || (NetName == "H") || (NetName == "HI") || (NetName == "HIGH"));
        }

        /// <summary>
        /// Returns true, if the net name contains hints to logivc level low or ground.
        /// </summary>
        /// <param name="NetName">Net name to check.</param>
        /// <returns>True, if ground or logic low.</returns>
        public static bool IsGroundOrLogicLow(string NetName)
        {
            return ((NetName == "VSS") || (NetName == "GND") || (NetName == "L") || (NetName == "LO") || (NetName == "LOW"));
        }

        /// <summary>
        /// Gets the number of connected outputs currently pulling Low.
        /// </summary>
        public int CountL
        {
            get { return countL; }
        }

        /// <summary>
        /// Gets the number of connected outputs currently pulling High.
        /// </summary>
        public int CountH
        {
            get { return countH; }
        }

        /// <summary>
        /// Gets the number of connected outputs currently in high impedance.
        /// </summary>
        public int CountZ
        {
            get { return CountZ; }
        }

        /// <summary>
        /// Gets the number of connected outputs currently in undefined state.
        /// </summary>
        public int CountU
        {
            get { return countU; }
        }
    }


    /// <summary>
    /// A class to encapsulate a list of pins.
    /// </summary>
    public class PinList
    {
        /// <summary>Owner of this list.</summary>
        private Net owner;
        /// <summary>Internal list of pins.</summary>
        private List<Pin> pins;

        /// <summary>
        /// Creates the PinList instance.
        /// </summary>
        /// <param name="Owner">Owner of this list.</param>
        public PinList(Net Owner)
        {
            owner = Owner;
            pins = new List<Pin>();
        }

        /// <summary>
        /// Get the pin object at the index.
        /// </summary>
        /// <param name="Idx">Index in the list.</param>
        /// <returns>Pin at the index.</returns>
        public Pin this[int Idx]
        {
            get { return pins[Idx]; }
        }

        /// <summary>
        /// Add a new pin object.
        /// </summary>
        /// <param name="Pin">Pin object to be added.</param>
        public void Add(Pin Pin)
        {
            if (pins.IndexOf(Pin) < 0)
            {
                pins.Add(Pin);
                if (Pin.ConnectedNet != owner)
                    Pin.ConnectedNet = owner;
            }
        }

        /// <summary>
        /// Add an array of pins to the current list.
        /// </summary>
        /// <param name="Pins">Oin array to be added.</param>
        public void AddRange(Pin[] Pins)
        {
            foreach (Pin pin in Pins)
                Add(pin);
        }

        /// <summary>
        /// Remove item at index i.
        /// </summary>
        /// <param name="i">Index of element to remove.</param>
        public void RemoveAt(int i)
        {
            pins.RemoveAt(i);
        }

        /// <summary>
        /// Remove item from pin list.
        /// </summary>
        /// <param name="Pin">Pin element to remove.</param>
        public void Remove(Pin Pin)
        {
            pins.Remove(Pin);
        }

        /// <summary>
        /// Enumerator for using this list in a foreach loop.
        /// </summary>
        /// <returns></returns>
        public IEnumerator<Pin> GetEnumerator()
        {
            return this.pins.GetEnumerator();
        }

        /// <summary>
        /// Gets the number of pins in the list.
        /// </summary>
        public int Count
        {
            get { return pins.Count; }
        }

    }


}
