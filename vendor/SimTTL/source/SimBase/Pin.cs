// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

#if DEBUG_WRITE
using System.Diagnostics;
#endif

namespace SimBase
{

    /// <summary>
    /// Enumeration of modes for the line mode of a pin.
    /// </summary>
    public enum LineMode
    {
        In,
        Out,
        BiDir,
        OpenDrain,
        Passive
    }

    /// <summary>
    /// Enumeration signal states.
    /// </summary>
    public enum SignalState
    {
        L,
        H,
        Z,
        U
    }

    /// <summary>
    /// Class definition of a Pin.
    /// </summary>
    public class Pin
    {
        /// <summary>Owner element of this pin.</summary>
        public readonly BaseElement Owner;
        /// <summary>Name of this pin.</summary>
        public readonly string Name;
        /// <summary>Pin number.</summary>
        public readonly string PinNo;
        /// <summary>Mode of the pin function.</summary>
        public readonly LineMode Mode;
        /// <summary>History of events of this pin.</summary>
        public readonly EventHistory History;

        /// <summary>Initial signal state at reset.</summary>
        protected SignalState initialState;
        /// <summary>The state of this pin.</summary>
        protected SignalState state;
        /// <summary>The new signal state passed to the state after the propagation time.</summary>
        protected SignalState newOutState;
        /// <summary>True, if the driver of an output or bi-directional pin is currently active.</summary>
        protected bool driverActive;
        /// <summary>Current simulation time in ns.</summary>
        protected double Time;
        /// <summary>Time of the last change.</summary>
        protected double changeTime;
        /// <summary>Propagation time delay of this pin.</summary>
        protected readonly double Delay;
        /// <summary>Reference to th connected net.</summary>
        protected Net connectedNet;

        /// <summary>
        /// Creates the Pin instance.
        /// </summary>
        /// <param name="Owner">Owner element of this pin.</param>
        /// <param name="Name">Name of this pin.</param>
        /// <param name="PinNo">Pin number.</param>
        public Pin(BaseElement Owner, string Name, string PinNo) : this(Owner, Name, PinNo, LineMode.Passive, SignalState.Z, 0) { }

        /// <summary>
        /// Creates the Pin instance.
        /// </summary>
        /// <param name="Owner">Owner element of this pin.</param>
        /// <param name="Name">Name of this pin.</param>
        /// <param name="PinNo">Pin number.</param>
        /// <param name="Mode">Mode of the pin function.</param>
        /// <param name="InitialState">Initial signal state at reset.</param>
        /// <param name="Delay">Propagation time delay of this pin.</param>
        public Pin(BaseElement Owner, string Name, string PinNo, LineMode Mode, SignalState InitialState, double Delay)
        {
            this.Owner = Owner;
            this.Name = Name;
            this.PinNo = PinNo;
            this.Mode = Mode;
            this.initialState = InitialState;
            this.Delay = Delay;
            this.connectedNet = null;
            this.History = new EventHistory(this);
            SimulationRestart();
        }

        /// <summary>
        /// Creates the Pin instance.
        /// </summary>
        /// <param name="Owner">Owner element of this pin.</param>
        /// <param name="Name">Name of this pin.</param>
        /// <param name="PinNo">Pin number.</param>
        /// <param name="Mode">Mode of the pin function.</param>
        /// <param name="InitialState">Initial signal state at reset.</param>
        /// <param name="Delay">Propagation time delay of this pin.</param>
        /// <param name="ConnectedNet">Reference to the connected net.</param>
        public Pin(BaseElement Owner, string Name, string PinNo, LineMode Mode, SignalState InitialState, double Delay, Net ConnectedNet) : this(Owner, Name, PinNo, Mode, InitialState, Delay)
        {
            if (ConnectedNet != null)
            {
                this.ConnectedNet = ConnectedNet;
                ConnectedNet.ConnectedPins.Add(this);
            }
        }

        /// <summary>
        /// Creates the Pin instance.
        /// </summary>
        /// <param name="Owner">Owner element of this pin.</param>
        /// <param name="Name">Name of this pin.</param>
        /// <param name="PinNo">Pin number.</param>
        /// <param name="Mode">Mode of the pin function.</param>
        /// <param name="InitialState">Initial signal state at reset.</param>
        /// <param name="ConnectedNet">Reference to the connected net.</param>
        public Pin(BaseElement Owner, string Name, string PinNo, LineMode Mode, SignalState InitialState, Net ConnectedNet) : this(Owner, Name, PinNo, Mode, InitialState, 0, ConnectedNet) { }


        /// <summary>
        /// Restart the simulation.
        /// </summary>
        public void SimulationRestart()
        {
            if (this.ConnectedNet != null)
                this.ConnectedNet.SimulationRestart();

            History.ResetHistory();
            Time = 0;
            this.driverActive = Mode == LineMode.Out;
            this.state = initialState;
            this.newOutState = initialState;
            this.changeTime = -2 * Delay;
            History.Add(Time, state);
        }

        /// <summary>
        /// Get the current state of the pin.
        /// </summary>
        /// <param name="Time">Time value.</param>
        /// <returns>SignalState determined.</returns>
        public SignalState GetLineState(double Time)
        {
            SignalState currState = SignalState.U;

            switch (Mode)
            {
                case LineMode.In:
                    if (ConnectedNet == null)
                        currState = SignalState.U;
                    else
                        currState = ConnectedNet.GetState(Time);
                    break;

                case LineMode.Out:
                    if (driverActive == true)
                        currState = state;
                    break;

                case LineMode.BiDir:
                    if (driverActive == true)
                        currState = state;
                    else
                        if (ConnectedNet == null)
                            currState = SignalState.U;
                        else
                            currState = ConnectedNet.GetState(Time);
                    break;

                case LineMode.OpenDrain:
                    if (driverActive == true)
                        currState = state;
                    else
                        if (ConnectedNet == null)
                            currState = SignalState.U;
                        else
                            currState = ConnectedNet.GetState(Time);
                    break;

                case LineMode.Passive:
                    currState = SignalState.Z;
                    break;

            }

            return currState;
        }


        /// <summary>
        /// Return the inverted state of the input state if possible.
        /// </summary>
        /// <param name="State">A state to be inverted.</param>
        /// <returns>Inverted state if input was low or high.</returns>
        public static SignalState InvertedState(SignalState State)
        {
            if (State == SignalState.L)
                return SignalState.H;

            if (State == SignalState.H)
                return SignalState.L;

            return State;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public void UpdateInput(double Time)
        {
            this.Time = Time;
            SignalState currState = GetLineState(Time);
#if DEBUG_WRITE
            Debug.Write("Time=" + Time.ToString() + "," + LongName + ",UpdateInput,,currState=" + currState.ToString() + ",lineState=" + lineState.ToString());
#endif
            if ((driverActive == false) && (currState != state))
            {
                state = currState;
                newOutState = currState;
                History.Add(Time, currState);
#if DEBUG_WRITE
                Debug.Write(",history added!");
#endif
            }

#if DEBUG_WRITE
            Debug.WriteLine("");
#endif
        }

        /// <summary>
        /// Update state to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public void UpdateOutput(double Time)
        {
            this.Time = Time;
            double dt = Time - changeTime;
#if DEBUG_WRITE
            Debug.Write("Time=" + Time.ToString() + "," + LongName + ",UpdateOutput,dt=" + dt.ToString()+"/"+Delay.ToString() + ",newOutState=" + newOutState.ToString() + ",state=" + state.ToString());
#endif
            if (dt >= Delay)
            {
                if (driverActive == true)
                {
                    if (newOutState != state)
                    {
                        History.Add(Time, newOutState);
#if DEBUG_WRITE
                        Debug.Write(",history added!");
#endif                  
                    }
                    state = newOutState;
                }
                if (Mode == LineMode.BiDir)
                {
                    if (newOutState == SignalState.Z)
                    {
                        driverActive = false;
                        if (newOutState != state)
                        {
                            History.Add(Time, newOutState);
                            state = newOutState;
                        }
                    }
                    else if ((newOutState == SignalState.L) || (newOutState == SignalState.H))
                    {
                        driverActive = true;
                        if (newOutState != state)
                        {
                            History.Add(Time, newOutState);
                            state = newOutState;
                        }
                    }
                }
                else if (Mode == LineMode.OpenDrain)
                {
                    if (newOutState == SignalState.L)
                    {
                        driverActive = true;
                        if (newOutState != state)
                        {
                            History.Add(Time, newOutState);
                            state = newOutState;
                        }
                    }
                    else
                    {
                        driverActive = false;
                        if (newOutState != state)
                        {
                            History.Add(Time, newOutState);
                            state = newOutState;
                        }
                    }
                }
            }
#if DEBUG_WRITE
            Debug.WriteLine(",DriverActive="+driverActive.ToString());
#endif
        }

        /// <summary>
        /// Set or get the new out state.
        /// </summary>
        public SignalState NewOutState
        {
            set
            {
                if (value != newOutState)
                {
                    newOutState = value;
                    changeTime = Time;
#if DEBUG_WRITE
                    Debug.WriteLine("Time=" + Time.ToString() + "," + LongName + ",NewOutState,,newOutState=" + newOutState.ToString() + ",state=" + state.ToString());
#endif
                }
            }
            get { return newOutState;  }
        }

        /// <summary>
        /// Set the output state of the pin and add changes to the history.
        /// </summary>
        /// <param name="State">SignalState to ste to.</param>
        public void SetOutState(SignalState State)
        {
            if (State != this.state)
            {
                newOutState = State;
                state = State;
                History.Add(Time, State);
            }
        }


        /// <summary>
        /// Set the output change time.
        /// </summary>
        /// <param name="Time">Time value to set to.</param>
        public void SetOutputChangeTime(double Time)
        { 
            changeTime = Time;
        }

        /// <summary>
        /// Deactivate the driver and set the out state to high impedance.
        /// </summary>
        public void DeactivateDriver()
        {
            SetOutState(SignalState.Z);
            driverActive = false;
        }

        /// <summary>
        /// True, if the driver of an output or bi-directional pin is currently active.
        /// </summary>
        public bool DriverActive
        {
            get { return driverActive; }
        }

        /// <summary>
        /// Get the current SignalState of this pin.
        /// </summary>
        public SignalState State
        {
            get { return state; }
        }

        /// <summary>
        /// Gets or sets the connected net.
        /// </summary>
        public Net ConnectedNet
        {
            get { return connectedNet; }
            set
            {
                if (connectedNet != value)
                {
                    connectedNet = value;
                    connectedNet.ConnectedPins.Add(this);
                }
            }
        }

        /// <summary>
        /// Gets the owner name plus pin name.
        /// </summary>
        public string LongName
        {
            get 
            {
                if ((Owner == null) || (Owner.Name == ""))
                    return Name;
                else
                    return Owner.Name + "." + Name; // +" #"+PinNo.ToString(); 
            }
        }

    }


}
