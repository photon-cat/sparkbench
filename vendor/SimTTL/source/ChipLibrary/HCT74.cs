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
using System.Text;
using System.Threading.Tasks;
using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT74.
    /// </summary>
    public class HCT74:BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct74.pdf

        private const double TYP_PROPAGATION_DELAY = 17;

        #region Private/Protected Fields
        private SignalState lastClk1;
        private SignalState lastClk2;
        #endregion Private/Protected Fields

        #region FF1 Pins
        public Pin CLK1;
        public Pin PRE1n;
        public Pin CLR1n;
        public Pin D1;
        public Pin Q1;
        public Pin Q1n;
        #endregion FF1 Pins

        #region FF2 Pins
        public Pin CLK2;
        public Pin PRE2n;
        public Pin CLR2n;
        public Pin D2;
        public Pin Q2;
        public Pin Q2n;
        #endregion FF2 Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT74(string Name) : this(Name, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT74(string Name, Net NetCLK1, Net NetPRE1n, Net NetCLR1n, Net NetD1, Net NetCLK2, Net NetPRE2n, Net NetCLR2n, Net NetD2) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "14");
            this.Ground[0] = new Pin(this, "GND", "7");

            this.CLK1 = new Pin(this, "CLK1", "3", LineMode.In, SignalState.L, NetCLK1);
            this.PRE1n = new Pin(this, "PRE1n", "4", LineMode.In, SignalState.L, NetPRE1n);
            this.CLR1n = new Pin(this, "CLR1n", "1", LineMode.In, SignalState.L, NetCLR1n);
            this.D1 = new Pin(this, "D1", "2", LineMode.In, SignalState.L, NetD1);
            this.Q1 = new Pin(this, "Q1", "5", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1n = new Pin(this, "Q1n", "6", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            lastClk1 = SignalState.L;

            this.CLK2 = new Pin(this, "CLK2", "11", LineMode.In, SignalState.L, NetCLK2);
            this.PRE2n = new Pin(this, "PRE2n", "10", LineMode.In, SignalState.L, NetPRE2n);
            this.CLR2n = new Pin(this, "CLR2n", "13", LineMode.In, SignalState.L, NetCLR2n);
            this.D2 = new Pin(this, "D2", "12", LineMode.In, SignalState.L, NetD2);
            this.Q2 = new Pin(this, "Q2", "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2n = new Pin(this, "Q2n", "8", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
            lastClk2 = SignalState.L;

            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, new Pin[] { this.CLK1, this.PRE1n, this.CLR1n, this.D1 });
            SetPinArray(Inputs, 1, new Pin[] { this.CLK2, this.PRE2n, this.CLR2n, this.D2 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, new Pin[] { this.Q1, this.Q1n });
            SetPinArray(Outputs, 1, new Pin[] { this.Q2, this.Q2n });

        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Implementation of the D-Flip-Flop function.
        /// </summary>
        /// <param name="lastClk">State of the clock pin from the last time.</param>
        /// <param name="CLK">State of the clock pin.</param>
        /// <param name="PREn">Pin to set the output state.</param>
        /// <param name="CLRn">Pin to clear the output state.</param>
        /// <param name="D">D input pin.</param>
        /// <param name="Q">Output pin.</param>
        /// <param name="Qn">Inverted output pin.</param>
        protected void DFF(ref SignalState lastClk, Pin CLK, Pin PREn, Pin CLRn, Pin D, Pin Q, Pin Qn)
        {
            if ((PREn.State == SignalState.L) && (CLRn.State == SignalState.L))
            {
                Q.NewOutState = SignalState.H;
                Qn.NewOutState = SignalState.H;
            }
            else if (PREn.State == SignalState.L)
            {
                Q.NewOutState = SignalState.H;
                Qn.NewOutState = SignalState.L;
            }
            else if (CLRn.State == SignalState.L)
            {
                Q.NewOutState = SignalState.L;
                Qn.NewOutState = SignalState.H;
            }
            else if ((lastClk == SignalState.L) && (CLK.State == SignalState.H))
            {
                if (D.State == SignalState.H)
                {
                    Q.NewOutState = SignalState.H;
                    Qn.NewOutState = SignalState.L;
                }
                else 
                {
                    Q.NewOutState = SignalState.L;
                    Qn.NewOutState = SignalState.H;
                }
            }

            lastClk = CLK.State;
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            DFF(ref lastClk1, CLK1, PRE1n, CLR1n, D1, Q1, Q1n);
            DFF(ref lastClk2, CLK2, PRE2n, CLR2n, D2, Q2, Q2n);
        }
        #endregion Public Methods

    }
}
